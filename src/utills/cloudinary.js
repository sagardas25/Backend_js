import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
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

    const optimizedUrl = cloudinary.url(response.public_id, {
      fetch_format: "auto",
      quality: "auto",
    });

    fs.unlink(localFilePath); // removing it from local server after uploading on cloudinary

    return optimizedUrl;
  } catch (error) {
    fs.unlinkSync(localFilePath); // removing the file from local storate as well
    return null;
  }
};

export { uploadOnCloudinary };
