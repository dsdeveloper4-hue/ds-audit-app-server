// lib/imageProcessor.ts
import sharp from "sharp";

/**
 * Resize and compress image to ensure it's under the target size
 * @param buffer - Original image buffer
 * @param maxSizeInMB - Maximum file size in MB (default: 5)
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param maxHeight - Maximum height in pixels (default: 1920)
 * @returns Processed image buffer
 */
export const processImage = async (
  buffer: Buffer,
  maxSizeInMB: number = 5,
  maxWidth: number = 1920,
  maxHeight: number = 1920
): Promise<Buffer> => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

  try {
    // Get image metadata
    const metadata = await sharp(buffer).metadata();

    // Start with high quality
    let quality = 90;
    let processedBuffer: Buffer;

    // Resize image if it's too large
    let sharpInstance = sharp(buffer);

    // Resize if dimensions exceed max
    if (
      metadata.width &&
      metadata.height &&
      (metadata.width > maxWidth || metadata.height > maxHeight)
    ) {
      sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Convert to JPEG for better compression (unless it's PNG with transparency)
    const hasAlpha = metadata.hasAlpha;
    if (hasAlpha) {
      // Keep as PNG if it has transparency
      sharpInstance = sharpInstance.png({ quality });
    } else {
      // Convert to JPEG for better compression
      sharpInstance = sharpInstance.jpeg({ quality, mozjpeg: true });
    }

    processedBuffer = await sharpInstance.toBuffer();

    // If still too large, reduce quality iteratively
    while (processedBuffer.length > maxSizeInBytes && quality > 20) {
      quality -= 10;

      sharpInstance = sharp(buffer);

      // Apply resize
      if (
        metadata.width &&
        metadata.height &&
        (metadata.width > maxWidth || metadata.height > maxHeight)
      ) {
        sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
          fit: "inside",
          withoutEnlargement: true,
        });
      }

      // Apply compression
      if (hasAlpha) {
        sharpInstance = sharpInstance.png({ quality });
      } else {
        sharpInstance = sharpInstance.jpeg({ quality, mozjpeg: true });
      }

      processedBuffer = await sharpInstance.toBuffer();
    }

    // If still too large after reducing quality, reduce dimensions further
    if (processedBuffer.length > maxSizeInBytes) {
      let scale = 0.9;
      while (processedBuffer.length > maxSizeInBytes && scale > 0.3) {
        const newWidth = Math.floor(maxWidth * scale);
        const newHeight = Math.floor(maxHeight * scale);

        sharpInstance = sharp(buffer).resize(newWidth, newHeight, {
          fit: "inside",
          withoutEnlargement: true,
        });

        if (hasAlpha) {
          sharpInstance = sharpInstance.png({ quality: 80 });
        } else {
          sharpInstance = sharpInstance.jpeg({ quality: 80, mozjpeg: true });
        }

        processedBuffer = await sharpInstance.toBuffer();
        scale -= 0.1;
      }
    }

    const finalSizeInMB = processedBuffer.length / (1024 * 1024);
    console.log(
      `Image processed: ${(buffer.length / (1024 * 1024)).toFixed(
        2
      )}MB → ${finalSizeInMB.toFixed(2)}MB (quality: ${quality})`
    );

    return processedBuffer;
  } catch (error) {
    console.error("Error processing image:", error);
    throw new Error(`Failed to process image: ${error.message}`);
  }
};

/**
 * Get image information
 * @param buffer - Image buffer
 * @returns Image metadata
 */
export const getImageInfo = async (buffer: Buffer) => {
  try {
    const metadata = await sharp(buffer).metadata();
    const sizeInMB = buffer.length / (1024 * 1024);

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      sizeInMB: parseFloat(sizeInMB.toFixed(2)),
      hasAlpha: metadata.hasAlpha,
    };
  } catch (error) {
    console.error("Error getting image info:", error);
    throw new Error(`Failed to get image info: ${error.message}`);
  }
};
