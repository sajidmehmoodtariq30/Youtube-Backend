import { v2 as cloudinary } from 'cloudinary';
import { ApiError } from './ApiError.js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadOnCloudinary = async (filePath) => {
    try {
        if (!filePath) return null;
        const response = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto",
        });
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return response;
    } catch (error) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return null;
    }
};


export const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return;
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error("Failed to delete image from Cloudinary:", error);
    }
};

export const deleteVideoFromCloudinary = async (cloudUrl) => {
    try {
      // Extract the public ID from the URL
      const urlParts = cloudUrl.split("/");
      const publicIdWithExtension = urlParts[urlParts.length - 1];
      const publicId = publicIdWithExtension.split(".")[0];
  
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "video",
      });
      console.log("Deleted:", result);
  
      return result;
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };