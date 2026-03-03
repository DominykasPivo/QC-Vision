import { MAX_PHOTOS_PER_UPLOAD } from "@/lib/constants/createTestConstants";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/webp"];

type ValidateResult = {
  acceptedFiles: File[];
  notice: string | null;
  reject: boolean;
};

export function validateSelectedFiles(files: File[]): ValidateResult {
  const invalidTypeFiles = files.filter(
    (file) => !file.type.startsWith("image/"),
  );
  if (invalidTypeFiles.length > 0) {
    return { acceptedFiles: [], notice: "File must be an image", reject: true };
  }

  const invalidFormatFiles = files.filter(
    (file) => !ALLOWED_FORMATS.includes(file.type),
  );
  if (invalidFormatFiles.length > 0) {
    return {
      acceptedFiles: [],
      notice: "Unsupported format. Allowed: JPEG, PNG, WEBP",
      reject: true,
    };
  }

  const oversizedFiles = files.filter((file) => file.size > MAX_FILE_SIZE);
  if (oversizedFiles.length > 0) {
    return {
      acceptedFiles: [],
      notice: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      reject: true,
    };
  }

  const emptyFiles = files.filter((file) => file.size === 0);
  if (emptyFiles.length > 0) {
    return { acceptedFiles: [], notice: "File is empty", reject: true };
  }

  // Limit only the upload batch size, not total photos
  if (files.length > MAX_PHOTOS_PER_UPLOAD) {
    return {
      acceptedFiles: files.slice(0, MAX_PHOTOS_PER_UPLOAD),
      notice: `You can upload up to ${MAX_PHOTOS_PER_UPLOAD} photos at once. ${files.length - MAX_PHOTOS_PER_UPLOAD} extra file(s) were not added.`,
      reject: false,
    };
  }

  return { acceptedFiles: files, notice: null, reject: false };
}
