import { v2 as cloudinary } from "cloudinary";
import { log } from "console";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CLOUD_API,
  api_secret: process.env.CLOUDINARY_CLOUD_SECRET, // Click 'View API Keys' above to copy your API secret
});


const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log("file uploaded on cloudinary , file url : " + response.url);

    // const optimizedUrl = cloudinary.url(response.public_id, {
    //   fetch_format: "auto",
    //   quality: "auto",
    // });

    fs.unlink(localFilePath, (err) => {
      if (err) {
        console.log(
          "error in deleting local server file after uploading on cloudinary" +
            err
        );
      }
    }); // removing it from local server after uploading on cloudinary

    return response;
  } catch (error) {
    console.log("error in cloudinary : " + error);

    fs.unlink(localFilePath, (err) => {
      if (err) {
        console.log("error in deleting from local server on  error" + err);
      }
    }); // removing the file from local storage as well if failed to upload on cloudinary
    return null;
  }
};

const deleteFromCloudinary = async (public_id) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id);
    console.log("deletd from cloudinary , public id : " + public_id )
    return result;
  } catch (error) {
    console.log("error while deleting file from cloudinary : " + error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
