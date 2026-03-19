import { parsePunchPhotoDataUrl } from './punch-photo';

describe('punch-photo', () => {
  it('accepts a valid jpeg data url', () => {
    const payload = parsePunchPhotoDataUrl('data:image/jpeg;base64,aGVsbG8=');

    expect(payload).not.toBeNull();
    expect(payload?.mimeType).toBe('image/jpeg');
    expect(payload?.buffer.toString('utf8')).toBe('hello');
  });

  it('returns null when no photo is provided', () => {
    expect(parsePunchPhotoDataUrl(undefined)).toBeNull();
    expect(parsePunchPhotoDataUrl('   ')).toBeNull();
  });

  it('rejects unsupported image mime types', () => {
    expect(() =>
      parsePunchPhotoDataUrl('data:image/gif;base64,aGVsbG8='),
    ).toThrow('Unsupported punch photo type');
  });
});
