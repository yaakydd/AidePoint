// utils/scanStorage.js
import { supabase } from './supabase'; // adjust path to wherever your client lives
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// ─────────────────────────────────────────────────────────────────
// DAILY SCAN LIMITS + BONUS TRACKING
//
// Source of truth for "how many scans today" is the Supabase `scans`
// table itself (created_by + created_at), not a local counter — this
// keeps counts correct across devices/reinstalls.
//
// The one thing Supabase can't tell us on its own is "has today's
// bonus already been granted" (since bonus is a UI/allowance concept,
// not a row in `scans`), so that one flag lives in AsyncStorage,
// keyed per user per day.
// ─────────────────────────────────────────────────────────────────

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

// Returns remaining scans for today (Infinity for unlimited plans).
// Safe to call before a scan happens — read-only, no side effects.
export async function getRemainingScans(userId, plan) {
  const baseLimit = plan?.scans?.dailyLimit ?? 0;
  if (baseLimit === Infinity) return Infinity;

  const count = await getTodayScanCount(userId);
  const bonusGranted = await isBonusGrantedToday(userId);
  const bonusScans = bonusGranted ? (plan?.scans?.bonusScans ?? 0) : 0;

  const effectiveLimit = baseLimit + bonusScans;
  return Math.max(effectiveLimit - count, 0);
}

// Called right after a scan row has already been inserted into Supabase.
// Recomputes remaining allowance and grants the bonus the first time the
// day's saveGoal is reached.
export async function recordScan(userId, plan) {
  const baseLimit = plan?.scans?.dailyLimit ?? 0;

  if (baseLimit === Infinity) {
    // Pro tier: unlimited scans, no daily bonus concept — saved-image
    // count toward renewal discount is handled server-side.
    return { remaining: Infinity, bonusJustGranted: false, bonusRemaining: 0 };
  }

  const count = await getTodayScanCount(userId); // includes the scan just inserted
  const saveGoal = plan?.scans?.saveGoal ?? Infinity;
  const bonusScans = plan?.scans?.bonusScans ?? 0;

  const alreadyGranted = await isBonusGrantedToday(userId);
  let bonusJustGranted = false;

  if (!alreadyGranted && count >= saveGoal && bonusScans > 0) {
    await setBonusGrantedToday(userId);
    bonusJustGranted = true;
  }

  const bonusActive = alreadyGranted || bonusJustGranted;
  const effectiveLimit = baseLimit + (bonusActive ? bonusScans : 0);
  const remaining = Math.max(effectiveLimit - count, 0);

  return {
    remaining,
    bonusJustGranted,
    bonusRemaining: bonusJustGranted ? bonusScans : 0,
  };
}