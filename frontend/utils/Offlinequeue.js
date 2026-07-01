// utils/offlineQueue.js
//
// Local-first offline queue for AidePoint.
//
// Every completed scan is saved locally FIRST (to AsyncStorage + local image
// file). When the device has a network connection the queue processor uploads
// the compressed image to Supabase Storage and writes the scan row. If
// either step fails, the item stays in the queue and retries next time.
//
// This means a lab technician in a rural clinic can:
//  1. Capture a blood smear and get an AI result (if online) OR
//  2. Capture and queue it for upload the next time they hit Wi-Fi/signal
//  3. Always see ALL their scans in ReportScreen, whether synced or not
//
// Usage:
//   import { enqueueUpload, processPendingQueue, getPendingCount } from '../utils/offlineQueue';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

const QUEUE_KEY = 'aidepoint:upload_queue_v1';

// ─── Compression ──────────────────────────────────────────────────────────────
// Resize to max 1024px on the longest side and compress to 75% JPEG quality.
// A typical microscope photo at 4K → ~120 KB after this, fast to upload on 2G.
export async function compressImage(uri) {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (err) {
    console.warn('[offlineQueue] compression failed, using original:', err.message);
    return uri; // fall back to original — still better than crashing
  }
}

// ─── Persist image locally ────────────────────────────────────────────────────
// Copy the compressed image into the app's document directory so it survives
// app restarts (unlike the camera temp cache which gets cleared).
export async function persistImageLocally(uri, scanId) {
  try {
    const ext  = uri.split('.').pop().split('?')[0] || 'jpg';
    const dest = `${FileSystem.documentDirectory}scans/${scanId}.${ext}`;

    // Make sure the directory exists
    await FileSystem.makeDirectoryAsync(
      `${FileSystem.documentDirectory}scans/`,
      { intermediates: true }
    );

    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch (err) {
    console.error('[offlineQueue] persistImageLocally failed:', err.message);
    return uri; // fall back to the original path
  }
}

// ─── Queue CRUD ───────────────────────────────────────────────────────────────
async function readQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getPendingCount() {
  const q = await readQueue();
  return q.filter(item => item.status === 'pending').length;
}

// ─── Enqueue ──────────────────────────────────────────────────────────────────
// Called immediately after a scan is analysed (online or offline result
// stored locally). The item is always written locally first, then the queue
// processor handles the Supabase upload in the background.
//
// `scanPayload` matches the shape expected by Supabase's `scans` table.
export async function enqueueUpload({
  localImageUri,  // the compressed, persisted local path
  scanPayload,    // the full scan row object (results JSON included)
  userId,
}) {
  const queue = await readQueue();

  const item = {
    id:            scanPayload.id ?? `local_${Date.now()}`,
    userId,
    localImageUri,
    scanPayload,
    status:        'pending',  // 'pending' | 'uploading' | 'done' | 'failed'
    attempts:      0,
    maxAttempts:   5,
    enqueuedAt:    new Date().toISOString(),
    lastAttemptAt: null,
    error:         null,
  };

  queue.push(item);
  await writeQueue(queue);
  console.log('[offlineQueue] enqueued:', item.id);
  return item;
}

// ─── Upload one item ──────────────────────────────────────────────────────────
async function uploadItem(item) {
  const { localImageUri, scanPayload, userId } = item;

  // 1. Upload image to Supabase Storage
  let imageUrl = null;

  if (localImageUri) {
    const ext      = localImageUri.split('.').pop().split('?')[0] || 'jpg';
    const filePath = `${userId}/${scanPayload.patient_id}_${Date.now()}.${ext}`;

    const response = await fetch(localImageUri);
    const blob     = await response.blob();

    const { error: uploadErr } = await supabase.storage
      .from('scan-images')
      .upload(filePath, blob, { contentType: `image/${ext}`, upsert: true });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage
      .from('scan-images')
      .getPublicUrl(filePath);

    imageUrl = urlData?.publicUrl ?? null;
  }

  // 2. Upsert the scan row (use upsert so a partial previous attempt doesn't
  //    create a duplicate row)
  const { error: scanErr } = await supabase
    .from('scans')
    .upsert({
      ...scanPayload,
      image_url: imageUrl,
      status:    'done',
      synced_at: new Date().toISOString(),
    });

  if (scanErr) throw scanErr;

  return imageUrl;
}

// ─── Process queue ────────────────────────────────────────────────────────────
// Call this:
//  - On app foreground (AppState change)
//  - When NetInfo reports connectivity restored
//  - After a successful scan (opportunistic sync)
//
// Processes items one at a time with exponential backoff tracking.
export async function processPendingQueue(onProgress) {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    console.log('[offlineQueue] processPendingQueue: no connection, skipping');
    return { processed: 0, failed: 0 };
  }

  const queue   = await readQueue();
  const pending = queue.filter(i => i.status === 'pending' && i.attempts < i.maxAttempts);

  let processed = 0;
  let failed    = 0;

  for (const item of pending) {
    // Mark as uploading
    item.status        = 'uploading';
    item.lastAttemptAt = new Date().toISOString();
    item.attempts     += 1;
    await writeQueue(queue);

    try {
      await uploadItem(item);
      item.status = 'done';
      item.error  = null;
      processed++;
      onProgress?.({ type: 'success', id: item.id, processed, remaining: pending.length - processed });
    } catch (err) {
      console.error(`[offlineQueue] upload failed for ${item.id}:`, err.message);
      item.status = item.attempts >= item.maxAttempts ? 'failed' : 'pending';
      item.error  = err.message;
      failed++;
      onProgress?.({ type: 'error', id: item.id, error: err.message });
    }

    await writeQueue(queue);
  }

  // Clean up items that are done and older than 7 days (keep failed for inspection)
  const cutoff    = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const cleaned   = queue.filter(
    i => !(i.status === 'done' && new Date(i.enqueuedAt).getTime() < cutoff)
  );
  await writeQueue(cleaned);

  return { processed, failed };
}

// ─── Delete local image after successful upload ───────────────────────────────
export async function deleteLocalImage(localUri) {
  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists) {
      await FileSystem.deleteAsync(localUri, { idempotent: true });
    }
  } catch (err) {
    console.warn('[offlineQueue] deleteLocalImage:', err.message);
  }
}
