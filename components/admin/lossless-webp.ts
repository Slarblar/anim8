/** Browser-side still conversion for the work bank, using libwebp via @jsquash/webp. */

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export async function toLosslessWebp(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image',
      premultiplyAlpha: 'none',
      colorSpaceConversion: 'none',
    });
  } catch {
    throw new Error('Could not read that image. Use a JPEG, PNG, WebP, GIF, or AVIF still.');
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Could not read that image.');
    context.drawImage(bitmap, 0, 0);
    const image = context.getImageData(0, 0, bitmap.width, bitmap.height);
    const { default: encode } = await import('@jsquash/webp/encode');
    const encoded = await encode(image, { lossless: 1, exact: 1 });
    if (encoded.byteLength > MAX_FILE_BYTES) {
      throw new Error('That image is too large after conversion. Try a smaller file.');
    }
    const base = file.name.replace(/\.[^.]+$/, '').trim() || 'still';
    return new File([encoded], `${base}.webp`, { type: 'image/webp' });
  } finally {
    bitmap.close();
  }
}
