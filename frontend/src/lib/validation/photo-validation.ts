/**
 * Photo validation utilities
 * Mirrors backend validation rules from PhotoService
 */

export const PHOTO_VALIDATION = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FORMATS: ["image/jpeg", "image/png", "image/webp"],
  MAX_PHOTOS_PER_UPLOAD: 6,
} as const;

export type PhotoValidationError = {
  type: "size" | "format" | "empty" | "type" | "count";
  message: string;
};

/**
 * Validate a single photo file
 */
export function validatePhotoFile(file: File): PhotoValidationError | null {
  // Check if file is empty
  if (file.size === 0) {
    return {
      type: "empty",
      message: "File is empty",
    };
  }

  // Check file size
  if (file.size > PHOTO_VALIDATION.MAX_FILE_SIZE) {
    const maxSizeMB = PHOTO_VALIDATION.MAX_FILE_SIZE / 1024 / 1024;
    return {
      type: "size",
      message: `File too large (max ${maxSizeMB}MB)`,
    };
  }

  // Check if it's an image
  if (!file.type.startsWith("image/")) {
    return {
      type: "type",
      message: "File must be an image",
    };
  }

  // Check specific format
  if (
    !(PHOTO_VALIDATION.ALLOWED_FORMATS as readonly string[]).includes(file.type)
  ) {
    return {
      type: "format",
      message: "Unsupported format. Allowed: JPEG, PNG, WEBP",
    };
  }

  return null;
}

/**
 * Validate multiple photo files
 */
export function validatePhotoFiles(files: File[]): PhotoValidationError | null {
  for (const file of files) {
    const error = validatePhotoFile(file);
    if (error) {
      return error;
    }
  }
  return null;
}

/**
 * Check if upload batch exceeds the per-upload limit
 */
export function validatePhotoCount(
  newFiles: File[],
): PhotoValidationError | null {
  if (newFiles.length > PHOTO_VALIDATION.MAX_PHOTOS_PER_UPLOAD) {
    return {
      type: "count",
      message: `You can upload up to ${PHOTO_VALIDATION.MAX_PHOTOS_PER_UPLOAD} photos at once. Please select fewer files.`,
    };
  }
  return null;
}

/**
 * Add new photos to existing list, limiting per-upload batch size
 */
export function mergePhotoFiles(
  existing: File[],
  newFiles: File[],
  maxPhotosPerUpload: number = PHOTO_VALIDATION.MAX_PHOTOS_PER_UPLOAD,
): { photos: File[]; warning: string | null } {
  // Limit only the new batch being uploaded, not the total
  const limitedNewFiles = newFiles.slice(0, maxPhotosPerUpload);
  const combined = [...existing, ...limitedNewFiles];

  if (newFiles.length > maxPhotosPerUpload) {
    return {
      photos: combined,
      warning: `You can upload up to ${maxPhotosPerUpload} files at once. ${newFiles.length - maxPhotosPerUpload} extra file(s) were not added.`,
    };
  }

  return {
    photos: combined,
    warning: null,
  };
}
