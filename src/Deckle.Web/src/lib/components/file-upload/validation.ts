export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

/**
 * Validate a file for upload to the image library.
 * Returns an error message, or null if the file is acceptable.
 */
export function validateImageFile(file: globalThis.File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Invalid file type. Only images are allowed: JPEG, PNG, GIF, WebP, SVG.';
  }

  if (file.size > MAX_FILE_SIZE) {
    return `File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB. Please compress the image or select a smaller file.`;
  }

  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
