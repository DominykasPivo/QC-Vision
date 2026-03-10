/**
 * Utility functions for cropping images
 */

export interface CropArea {
  x: number; // X coordinate (pixels)
  y: number; // Y coordinate (pixels)
  width: number; // Width (pixels)
  height: number; // Height (pixels)
}

/**
 * Crop an image file to the specified area
 * Returns a new File object with the cropped image
 */
export async function cropImageFile(
  file: File,
  cropArea: CropArea,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    img.onload = () => {
      // Set canvas size to crop dimensions
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;

      // Draw the cropped portion of the image
      ctx.drawImage(
        img,
        cropArea.x, // Source X
        cropArea.y, // Source Y
        cropArea.width, // Source width
        cropArea.height, // Source height
        0, // Destination X
        0, // Destination Y
        cropArea.width, // Destination width
        cropArea.height, // Destination height
      );

      // Convert canvas to blob, then to File
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob from canvas"));
            return;
          }

          const croppedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(croppedFile);
        },
        file.type,
        0.95,
      );
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate crop area to maintain aspect ratio
 */
export function calculateAspectRatioCrop(
  imageWidth: number,
  imageHeight: number,
  aspectRatio: number, // width / height (e.g., 1 for square, 16/9 for landscape)
): CropArea {
  const imageAspectRatio = imageWidth / imageHeight;

  let cropWidth: number;
  let cropHeight: number;

  if (imageAspectRatio > aspectRatio) {
    // Image is wider than desired aspect ratio
    cropHeight = imageHeight;
    cropWidth = imageHeight * aspectRatio;
  } else {
    // Image is taller than desired aspect ratio
    cropWidth = imageWidth;
    cropHeight = imageWidth / aspectRatio;
  }

  // Center the crop
  const x = (imageWidth - cropWidth) / 2;
  const y = (imageHeight - cropHeight) / 2;

  return {
    x: Math.max(0, Math.round(x)),
    y: Math.max(0, Math.round(y)),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
  };
}

/**
 * Validate crop area is within image bounds
 */
export function validateCropArea(
  cropArea: CropArea,
  imageWidth: number,
  imageHeight: number,
): boolean {
  return (
    cropArea.x >= 0 &&
    cropArea.y >= 0 &&
    cropArea.x + cropArea.width <= imageWidth &&
    cropArea.y + cropArea.height <= imageHeight &&
    cropArea.width > 0 &&
    cropArea.height > 0
  );
}
