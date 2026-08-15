import { supabase } from './supabase'; // adjust path to wherever your client lives
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BUCKET = 'scan-images';

export async function hasImageConsent(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('store_images')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('scanStorage: failed to check consent', error);
    // fail closed - if we can't confirm consent, don't upload
    return false;
  }

  return !!data?.store_images;
}


export async function uploadScanImage(userId, imageUri, scanId) {
  const consented = await hasImageConsent(userId);
  if (!consented) {
    return null;
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const path = `${userId}/${scanId}.jpg`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, decode(base64), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw error;

    return path;
  } catch (err) {
    console.error('scanStorage: upload failed', err);
    // don't block the scan flow just because image upload failed -
    // the CBC/analysis result still matters even if we couldn't save the photo
    return null;
  }
}

// if someone toggles consent OFF in ProfileScreen, wipe what's already stored.
// not wired up anywhere yet - ProfileScreen needs to call this on toggle-off.
export async function deleteAllScanImages(userId) {
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(userId);

  if (listError) {
    console.error('scanStorage: failed to list images for deletion', listError);
    return false;
  }
  if (!files?.length) return true;

  const paths = files.map((f) => `${userId}/${f.name}`);
  const { error: deleteError } = await supabase.storage.from(BUCKET).remove(paths);

  if (deleteError) {
    console.error('scanStorage: failed to delete images', deleteError);
    return false;
  }

  return true;
}

// base64 -> ArrayBuffer, supabase-js wants raw bytes not a base64 string
function decode(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function todayKeyForUser(userId) {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, local device date
  return `aidepoint:bonus_granted:${userId}:${day}`;
}

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function getTodayScanCount(userId) {
  const { count, error } = await supabase
    .from('scans')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId)
    .gte('created_at', startOfTodayISO());

  if (error) {
    console.error('scanStorage: failed to count today\'s scans', error);
    // fail safe: assume 0 rather than blocking the tech from scanning
    return 0;
  }
  return count ?? 0;
}

async function isBonusGrantedToday(userId) {
  try {
    const val = await AsyncStorage.getItem(todayKeyForUser(userId));
    return val === 'true';
  } catch {
    return false;
  }
}

async function setBonusGrantedToday(userId) {
  try {
    await AsyncStorage.setItem(todayKeyForUser(userId), 'true');
  } catch (err) {
    console.error('scanStorage: failed to persist bonus flag', err);
  }
}

export async function getRemainingScans(userId, plan) {
  const baseLimit = plan?.scans?.dailyLimit ?? 0;
  if (baseLimit === Infinity) return Infinity;

  const count = await getTodayScanCount(userId);
  const bonusGranted = await isBonusGrantedToday(userId);
  const consented = await hasImageConsent(userId);
  const bonusScans = (bonusGranted && consented) ? (plan?.scans?.bonusScans ?? 0) : 0;

  const effectiveLimit = baseLimit + bonusScans;
  return Math.max(effectiveLimit - count, 0);
}

export async function recordScan(userId, plan) {
  const baseLimit = plan?.scans?.dailyLimit ?? 0;

  if (baseLimit === Infinity) {
    return { remaining: Infinity, bonusJustGranted: false, bonusRemaining: 0 };
  }

  const count = await getTodayScanCount(userId); // includes the scan just inserted
  const saveGoal = plan?.scans?.saveGoal ?? Infinity;
  const bonusScans = plan?.scans?.bonusScans ?? 0;
  const consented = await hasImageConsent(userId);

  const alreadyGranted = await isBonusGrantedToday(userId);
  let bonusJustGranted = false;

  if (!alreadyGranted && consented && count >= saveGoal && bonusScans > 0) {
    await setBonusGrantedToday(userId);
    bonusJustGranted = true;
  }

  const bonusActive = (alreadyGranted || bonusJustGranted) && consented;
  const effectiveLimit = baseLimit + (bonusActive ? bonusScans : 0);
  const remaining = Math.max(effectiveLimit - count, 0);

  return {
    remaining,
    bonusJustGranted,
    bonusRemaining: bonusJustGranted ? bonusScans : 0,
  };
}
