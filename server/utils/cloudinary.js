import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import config from "../utils/config.js";
// import { ingestPdf } from "../pipeline/store/ingestPdf.js";

cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // Check if file exists before uploading
        if (!fs.existsSync(localFilePath)) {
            console.error(`File does not exist: ${localFilePath}`);
            return null;
        }

        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        if(response.error) {
            console.error("Error uploading file to Cloudinary:", response.error);
            return null;
        }

        console.log("File uploaded successfully:", JSON.stringify(response));

        // await ingestPdf(localFilePath, response.public_id);

        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        console.error("Error uploading file to Cloudinary:", error);
        return null;
    }
};

const deleteFromCloudinary = async (imageId) => {
    try {
        if (!imageId) {
            console.warn('No image ID provided for deletion');
            return null;
        }
        const response = await cloudinary.uploader.destroy(imageId);
        return response;
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        throw error;
    }
};

export { uploadToCloudinary, deleteFromCloudinary };