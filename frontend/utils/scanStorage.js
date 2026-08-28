import { supabase } from './supabase';

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
    console.log('scanStorage: starting image upload');
    console.log('scanStorage: imageUri:', imageUri);
    console.log('scanStorage: userId:', userId);
    console.log('scanStorage: scanId:', scanId);

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

    const arrayBuffer = await response.arrayBuffer();

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('Image file is empty.');
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

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('scanStorage: Supabase upload error:', {
        message: error.message,
        name: error.name,
        details: error,
      });

      throw error;
    }

    const uploadedPath = data?.path ?? path;

    console.log('scanStorage: upload successful:', uploadedPath);

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
    console.error('scanStorage: upload failed:', {
      message: err?.message,
      name: err?.name,
      stack: err?.stack,
      error: err,
    });

    return {
      success: false,
      skipped: false,
      reason: err?.message || 'image_upload_failed',
      path: null,
    };
  }
}

/**
 * Delete all scan images belonging to a user.
 *
 * Used when image-storage consent is turned off.
 */
export async function deleteAllScanImages(userId) {
  const { data: files, error: listError } = await supabase.storage
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

  const paths = files.map((file) => `${userId}/${file.name}`);

  const { error: deleteError } = await supabase.storage
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
 * Remaining scans is sourced entirely from the backend's /predict
 * response (scans_remaining_today) or, on a 429, from the error body's
 * daily_limit -- both come from check_and_enforce_scan_limit(), the one
 * place the daily limit + consent-gated bonus is computed and enforced.
 *
 * We deliberately do NOT keep a local scans table / AsyncStorage bonus
 * flag anymore. The previous client-side implementation counted from a
 * separate `scans` table using LOCAL midnight, granted its bonus without
 * checking image-storage consent... while the backend counted from
 * `prediction_records` using UTC midnight. Two independent
 * implementations of the same "today's count + bonus" rule is what
 * caused the "2 remaining" vs. "limit reached (6)" inconsistency, and
 * a request that timed out client-side but completed server-side would
 * never update the old local count at all. One rule, enforced once, on
 * the server; the client just displays what it's told.
 */
export function getRemainingScansFromPredictResponse(predictResponse) {
  return predictResponse?.scans_remaining_today ?? null;
}

/**
 * Extract the effective daily limit from a 429 scan_limit_reached error.
 * `errorDetail` is the `detail` object FastAPI sends on the 429 response
 * (i.e. err.response.data.detail, however your API client surfaces it).
 */
export function getScanLimitFrom429(errorDetail) {
  return errorDetail?.daily_limit ?? null;
}
