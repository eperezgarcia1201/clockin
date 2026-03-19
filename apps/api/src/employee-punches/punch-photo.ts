import { BadRequestException } from '@nestjs/common';

const allowedPunchPhotoMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);

const maxPunchPhotoDataUrlLength = 6_000_000;
const maxPunchPhotoBytes = 4 * 1024 * 1024;

export type PunchPhotoInput = {
  buffer: Buffer;
  mimeType: string;
};

export const parsePunchPhotoDataUrl = (
  photoDataUrl?: string | null,
): PunchPhotoInput | null => {
  const normalized = photoDataUrl?.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length > maxPunchPhotoDataUrlLength) {
    throw new BadRequestException('Punch photo is too large.');
  }

  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(
    normalized,
  );
  if (!match) {
    throw new BadRequestException(
      'photoDataUrl must be a valid image data URL.',
    );
  }

  const mimeType = match[1].trim().toLowerCase();
  if (!allowedPunchPhotoMimeTypes.has(mimeType)) {
    throw new BadRequestException(
      'Unsupported punch photo type. Use JPEG, PNG, WebP, or HEIC.',
    );
  }

  const base64 = match[2].replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) {
    throw new BadRequestException('Punch photo base64 is invalid.');
  }

  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) {
    throw new BadRequestException('Punch photo is empty.');
  }
  if (buffer.length > maxPunchPhotoBytes) {
    throw new BadRequestException('Punch photo is too large.');
  }

  return {
    buffer,
    mimeType,
  };
};
