/**
 * Photo validation utilities
 * Mirrors backend validation rules from PhotoService
 */

export const PHOTO_VALIDATION = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FORMATS: ["image/jpeg", "image/png", "image/webp"],
  MAX_PHOTOS_PER_TEST: 6,
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
 * Check if adding new photos would exceed the limit
 */
export function validatePhotoCount(
  currentCount: number,
  newFiles: File[],
): PhotoValidationError | null {
  const totalCount = currentCount + newFiles.length;
  if (totalCount > PHOTO_VALIDATION.MAX_PHOTOS_PER_TEST) {
    return {
      type: "count",
      message: `You can upload up to ${PHOTO_VALIDATION.MAX_PHOTOS_PER_TEST} photos. Extra files were not added.`,
    };
  }
  return null;
}

/**
 * Add new photos to existing list, respecting the maximum limit
 */
export function mergePhotoFiles(
  existing: File[],
  newFiles: File[],
  maxPhotos: number = PHOTO_VALIDATION.MAX_PHOTOS_PER_TEST,
): { photos: File[]; warning: string | null } {
  const combined = [...existing, ...newFiles];

  if (combined.length > maxPhotos) {
    return {
      photos: combined.slice(0, maxPhotos),
      warning: `You can upload up to ${maxPhotos} photos. Extra files were not added.`,
    };
  }

  return {
    photos: combined,
    warning: null,
  };
}
