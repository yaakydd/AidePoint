import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';


// Copies a picker/camera URI into app-controlled cache storage immediately,
// before the OS has a chance to evict the original temp file. Must be
// called as soon as an image is captured or picked , NOT deferred until
// analysis time, since expo-image-picker's returned URI is not guaranteed
// to stay valid while the user fills out the rest of the form.
export async function stabilizeImage(uri) {
  try {
    const safeUri =
      `${FileSystem.cacheDirectory}aidepoint_${Date.now()}.jpg`;

    await FileSystem.copyAsync({
      from: uri,
      to: safeUri,
    });

    return safeUri;

  } catch (error) {
    console.error(
      "stabilizeImage failed:",
      error
    );
    throw error;
  }
}


// Compresses an already-stabilized image (see stabilizeImage above) ahead
// of upload/analysis. Assumes `uri` already points to a safe app-owned
// file, so no copy step is needed here anymore.
// utils/imageUtils.js
export async function prepareImage(uri) {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      throw new Error('IMAGE_EXPIRED');
    }

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
    );

    return result.uri;
  } catch (error) {
    console.error("prepareImage failed:", error);
    throw error;
  }
}