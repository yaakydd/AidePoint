import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';


export async function prepareImage(uri) {

  try {

    // Copy picker/camera temporary file into app storage
    const safeUri =
      `${FileSystem.cacheDirectory}aidepoint_${Date.now()}.jpg`;

    await FileSystem.copyAsync({
      from: uri,
      to: safeUri,
    });


    // Compress image
    const result =
      await ImageManipulator.manipulateAsync(
        safeUri,
        [
          {
            resize: {
              width: 1024,
            },
          },
        ],
        {
          compress: 0.75,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );


    console.log(
      "prepareImage compressed:",
      result.uri
    );


    return result.uri;


  } catch(error){

    console.error(
      "prepareImage failed:",
      error
    );

    throw error;
  }
}