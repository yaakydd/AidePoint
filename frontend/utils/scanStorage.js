// utils/scanStorage.js
import { supabase } from './supabase'; // adjust path to wherever your client lives
import * as FileSystem from 'expo-file-system';

const BUCKET = 'scan-images';

// checks whether this user has opted in to having their smear images stored
// (set at signup or toggled later in ProfileScreen)
export async function hasImageConsent(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('consent_reqired')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('scanStorage: failed to check consent', error);
    // fail closed - if we can't confirm consent, don't upload
    return false;
  }

  return !!data?.images_consent;
}

// uploads a scan image if (and only if) the user has consented.
// returns the storage path on success, null if skipped/failed.
// imageUri is whatever local uri comes out of the camera/picker.
export async function uploadScanImage(userId, imageUri, scanId) {
  const consented = await hasImageConsent(userId);
  if (!consented) {
    // not an error - just respecting the user's choice, nothing to upload
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