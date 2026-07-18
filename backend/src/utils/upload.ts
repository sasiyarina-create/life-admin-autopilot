import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import multer from 'multer';
import { AppError } from './app-error.js';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const allowedMimeTypes = new Set(['image/png', 'image/jpeg']);
const uploadsDirectory = resolve(process.cwd(), '..', 'uploads');

mkdirSync(uploadsDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDirectory,
  filename: (_request, file, callback) => callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
});

export const imageUpload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new AppError('Invalid file type. Upload a PNG, JPG, or JPEG image.', 415));
      return;
    }
    callback(null, true);
  },
});

/** Reject renamed PDFs or other payloads that claim to be an accepted image MIME type. */
export function assertSupportedImageContents(fileContents: Buffer): void {
  const isPng = fileContents.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = fileContents.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (!isPng && !isJpeg) {
    throw new AppError('Invalid file type. Upload a PNG, JPG, or JPEG image.', 415);
  }
}
