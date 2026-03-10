/**
 * Utility functions for rotating images
 */

/**
 * Rotate an image file by specified degrees (90, 180, or 270)
 * Returns a new File object with the rotated image
 */
export async function rotateImageFile(
  file: File,
  degrees: number,
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
      // Normalize rotation to 0-360 range
      const rotation = ((degrees % 360) + 360) % 360;

      // For 90 and 270 degrees, swap width and height
      if (rotation === 90 || rotation === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      // Apply rotation
      ctx.save();
      if (rotation === 90) {
        ctx.translate(canvas.width, 0);
        ctx.rotate((90 * Math.PI) / 180);
      } else if (rotation === 180) {
        ctx.translate(canvas.width, canvas.height);
        ctx.rotate((180 * Math.PI) / 180);
      } else if (rotation === 270) {
        ctx.translate(0, canvas.height);
        ctx.rotate((270 * Math.PI) / 180);
      }

      ctx.drawImage(img, 0, 0);
      ctx.restore();

      // Convert canvas to blob, then to File
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob from canvas"));
            return;
          }

          const rotatedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(rotatedFile);
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
 * Get CSS transform for rotation degrees
 */
export function getRotationTransform(degrees: number): string {
  const rotation = ((degrees % 360) + 360) % 360;
  return rotation === 0 ? "" : `rotate(${rotation}deg)`;
}
