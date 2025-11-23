// lib/cloudinary.ts
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import config from "@app/config";
import { Readable } from "stream";

// Initialize Cloudinary with config
cloudinary.config({
  cloud_name: config.cloudinary.cloudname,
  api_key: config.cloudinary.cloudinary_api_key,
  api_secret: config.cloudinary.cloudinary_api_secret,
});

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
}

/**
 * Upload an image buffer to Cloudinary
 * @param fileBuffer - The image file buffer from multer
 * @param folder - The folder path in Cloudinary (e.g., "asset-purchases/items")
 * @returns CloudinaryUploadResult with secure_url and other metadata
 */
export const uploadImage = async (
  fileBuffer: Buffer,
  folder: string
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "image",
        transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
          });
        } else {
          reject(new Error("Upload failed: No result returned"));
        }
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    const bufferStream = Readable.from(fileBuffer);
    bufferStream.pipe(uploadStream);
  });
};

/**
 * Delete an image from Cloudinary
 * @param publicId - The public_id of the image to delete
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Failed to delete image from Cloudinary:", error);
    throw error;
  }
};

export default cloudinary;
