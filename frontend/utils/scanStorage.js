import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BUCKET = 'scan-images';

/**
 * Check whether the user has explicitly consented
 * to storing scan images.
 *
 * Fails closed:
 * if consent cannot be confirmed, images are not uploaded.
 */
export async function hasImageConsent(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('store_images')
    .eq('id', userId)
    .single();

  if (error) {
    console.error(
      'scanStorage: failed to check consent:',
      error
    );

    // Fail closed.
    return false;
  }

  return !!data?.store_images;
}

/**
 * Upload a scan image only when the user has consented.
 *
 * IMPORTANT:
 * A failed image upload must NOT prevent the
 * already-successful AI analysis from being displayed.
 *
 * Returns:
 * {
 *   success: boolean,
 *   skipped: boolean,
 *   reason: string | null,
 *   path: string | null
 * }
 */
export async function uploadScanImage(
  userId,
  imageUri,
  scanId
) {
  if (!userId || !imageUri || !scanId) {
    console.error(
      'scanStorage: invalid upload parameters',
      {
        hasUserId: !!userId,
        imageUri,
        scanId,
      }
    );

    return {
      success: false,
      skipped: true,
      reason: 'invalid_parameters',
      path: null,
    };
  }

  const consented = await hasImageConsent(userId);

  /**
   * No consent means:
   * - do not upload
   * - do not treat it as an error
   * - allow the scan result to continue displaying
   */
  if (!consented) {
    console.log(
      'scanStorage: image upload skipped - user has not consented'
    );

    return {
      success: false,
      skipped: true,
      reason: 'no_consent',
      path: null,
    };
  }

  try {
    console.log(
      'scanStorage: starting image upload'
    );

    console.log(
      'scanStorage: imageUri:',
      imageUri
    );

    console.log(
      'scanStorage: userId:',
      userId
    );

    console.log(
      'scanStorage: scanId:',
      scanId
    );

    /**
     * Read the local Expo file directly as binary data.
     *
     * This avoids:
     *
     * image
     * -> base64
     * -> atob()
     * -> Uint8Array
     * -> ArrayBuffer
     *
     * and instead gives Supabase the ArrayBuffer directly.
     */
    const response = await fetch(imageUri);

    if (!response.ok) {
      throw new Error(
        `Unable to read local image: HTTP ${response.status}`
      );
    }

    const arrayBuffer =
      await response.arrayBuffer();

    if (
      !arrayBuffer ||
      arrayBuffer.byteLength === 0
    ) {
      throw new Error(
        'Image file is empty.'
      );
    }

    console.log(
      'scanStorage: image size:',
      arrayBuffer.byteLength,
      'bytes'
    );

    /**
     * Keep your existing storage structure:
     *
     * userId/scanId.jpg
     */
    const path = `${userId}/${scanId}.jpg`;

    const { data, error } =
      await supabase.storage
        .from(BUCKET)
        .upload(
          path,
          arrayBuffer,
          {
            contentType: 'image/jpeg',
            upsert: true,
          }
        );

    if (error) {
      console.error(
        'scanStorage: Supabase upload error:',
        {
          message: error.message,
          name: error.name,
          details: error,
        }
      );

      throw error;
    }

    const uploadedPath =
      data?.path ?? path;

    console.log(
      'scanStorage: upload successful:',
      uploadedPath
    );

    return {
      success: true,
      skipped: false,
      reason: null,
      path: uploadedPath,
    };
  } catch (err) {
    /**
     * IMPORTANT:
     * Do NOT throw here.
     *
     * The /predict request has already succeeded.
     * An image-storage failure should not destroy
     * the prediction result.
     */
    console.error(
      'scanStorage: upload failed:',
      {
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
        error: err,
      }
    );

    return {
      success: false,
      skipped: false,
      reason:
        err?.message ||
        'image_upload_failed',
      path: null,
    };
  }
}

/**
 * Delete all scan images belonging to a user.
 *
 * Used when image-storage consent is turned off.
 */
export async function deleteAllScanImages(
  userId
) {
  const { data: files, error: listError } =
    await supabase.storage
      .from(BUCKET)
      .list(userId);

  if (listError) {
    console.error(
      'scanStorage: failed to list images for deletion:',
      listError
    );

    return false;
  }

  if (!files?.length) {
    return true;
  }

  const paths = files.map(
    (file) =>
      `${userId}/${file.name}`
  );

  const {
    error: deleteError,
  } = await supabase.storage
    .from(BUCKET)
    .remove(paths);

  if (deleteError) {
    console.error(
      'scanStorage: failed to delete images:',
      deleteError
    );

    return false;
  }

  return true;
}

/**
 * Storage key for today's bonus state.
 */
function todayKeyForUser(userId) {
  const day = new Date()
    .toISOString()
    .slice(0, 10);

  return `aidepoint:bonus_granted:${userId}:${day}`;
}

/**
 * Start of today's date.
 */
function startOfTodayISO() {
  const d = new Date();

  d.setHours(0, 0, 0, 0);

  return d.toISOString();
}

/**
 * Get today's number of scans for the user.
 */
async function getTodayScanCount(
  userId
) {
  const {
    count,
    error,
  } = await supabase
    .from('scans')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('created_by', userId)
    .gte(
      'created_at',
      startOfTodayISO()
    );

  if (error) {
    console.error(
      "scanStorage: failed to count today's scans:",
      error
    );

    // Preserve your original fail-safe behavior.
    return 0;
  }

  return count ?? 0;
}

/**
 * Check whether today's bonus has already been granted.
 */
async function isBonusGrantedToday(
  userId
) {
  try {
    const val =
      await AsyncStorage.getItem(
        todayKeyForUser(userId)
      );

    return val === 'true';
  } catch (err) {
    console.error(
      'scanStorage: failed to read bonus flag:',
      err
    );

    return false;
  }
}

/**
 * Persist today's bonus state.
 */
async function setBonusGrantedToday(
  userId
) {
  try {
    await AsyncStorage.setItem(
      todayKeyForUser(userId),
      'true'
    );
  } catch (err) {
    console.error(
      'scanStorage: failed to persist bonus flag:',
      err
    );
  }
}

/**
 * Calculate remaining scans.
 */
export async function getRemainingScans(
  userId,
  plan
) {
  const baseLimit =
    plan?.scans?.dailyLimit ?? 0;

  if (baseLimit === Infinity) {
    return Infinity;
  }

  const count =
    await getTodayScanCount(userId);

  const bonusGranted =
    await isBonusGrantedToday(userId);

  const consented =
    await hasImageConsent(userId);

  const bonusScans =
    bonusGranted && consented
      ? plan?.scans?.bonusScans ?? 0
      : 0;

  const effectiveLimit =
    baseLimit + bonusScans;

  return Math.max(
    effectiveLimit - count,
    0
  );
}

/**
 * Record a scan and handle the daily bonus.
 */
export async function recordScan(
  userId,
  plan
) {
  const baseLimit =
    plan?.scans?.dailyLimit ?? 0;

  if (baseLimit === Infinity) {
    return {
      remaining: Infinity,
      bonusJustGranted: false,
      bonusRemaining: 0,
    };
  }

  /**
   * This count includes the scan that was
   * just inserted into the scans table.
   */
  const count =
    await getTodayScanCount(userId);

  const saveGoal =
    plan?.scans?.saveGoal ?? Infinity;

  const bonusScans =
    plan?.scans?.bonusScans ?? 0;

  const consented =
    await hasImageConsent(userId);

  const alreadyGranted =
    await isBonusGrantedToday(userId);

  let bonusJustGranted = false;

  if (
    !alreadyGranted &&
    consented &&
    count >= saveGoal &&
    bonusScans > 0
  ) {
    await setBonusGrantedToday(userId);

    bonusJustGranted = true;
  }

  const bonusActive =
    (
      alreadyGranted ||
      bonusJustGranted
    ) &&
    consented;

  const effectiveLimit =
    baseLimit +
    (bonusActive
      ? bonusScans
      : 0);

  const remaining =
    Math.max(
      effectiveLimit - count,
      0
    );

  return {
    remaining,
    bonusJustGranted,
    bonusRemaining:
      bonusJustGranted
        ? bonusScans
        : 0,
  };
}