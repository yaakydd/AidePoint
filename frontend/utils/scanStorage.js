// utils/scanStorage.js
import { supabase } from './supabase'; // adjust path to wherever your client lives
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BUCKET = 'scan-images';

// checks whether this user has opted in to having their smear images stored
// (set at signup or toggled later in ProfileScreen)
//
// FIXED: this used to .select('consent_reqired') but then read
// data?.images_consent -- selecting one column and reading a different,
// never-selected one. That meant data.images_consent was always
// undefined, so this function returned false for every user, always,
// regardless of their real consent setting. Both sides now agree on
// images_consent.
export async function hasImageConsent(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('images_consent')
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
//
// FIXED: the bonus was being granted purely for reaching `saveGoal`
// scans, with no relationship at all to image-save consent -- despite
// the bonus being framed everywhere ("save 5 images") as a reward for
// opting in to having images stored. A user who never consented to
// image storage was still getting the bonus just by running 5 scans,
// because recordScan() never called hasImageConsent(). Both
// getRemainingScans() and recordScan() now require hasImageConsent()
// to be true before the bonus can be granted or counted as active --
// so a non-consenting user who hits 5 scans gets no bonus, and if they
// later toggle consent ON, the bonus becomes available going forward
// (not retroactively re-granted for scans already done without consent).
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
  // A bonus can only count as "active" if the user has actually
  // consented to image saving -- see FIXED note above. Without this,
  // a non-consenting user whose AsyncStorage flag was somehow set
  // (e.g. consent was toggled off AFTER the bonus was granted earlier
  // that day) would still see the extra scans as available.
  const consented = await hasImageConsent(userId);
  const bonusScans = (bonusGranted && consented) ? (plan?.scans?.bonusScans ?? 0) : 0;

  const effectiveLimit = baseLimit + bonusScans;
  return Math.max(effectiveLimit - count, 0);
}

// Called right after a scan row has already been inserted into Supabase.
// Recomputes remaining allowance and grants the bonus the first time the
// day's saveGoal is reached -- but only for users who've consented to
// having their scan images saved, since the bonus is explicitly framed
// (in-app copy, plan config) as a reward for that opt-in, not just for
// running a certain number of scans.
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
  const consented = await hasImageConsent(userId);

  const alreadyGranted = await isBonusGrantedToday(userId);
  let bonusJustGranted = false;

  if (!alreadyGranted && consented && count >= saveGoal && bonusScans > 0) {
    await setBonusGrantedToday(userId);
    bonusJustGranted = true;
  }

  // Bonus only counts as active this run if it was granted (just now or
  // earlier today) AND the user is currently consented -- so toggling
  // consent off mid-day immediately stops the bonus from applying to
  // the remaining-scans math, even if the AsyncStorage flag from
  // earlier is still set to true.
  const bonusActive = (alreadyGranted || bonusJustGranted) && consented;
  const effectiveLimit = baseLimit + (bonusActive ? bonusScans : 0);
  const remaining = Math.max(effectiveLimit - count, 0);

  return {
    remaining,
    bonusJustGranted,
    bonusRemaining: bonusJustGranted ? bonusScans : 0,
  };
}
