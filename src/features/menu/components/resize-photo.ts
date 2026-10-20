/** Shrinks a phone photo before upload: a 12 MP camera shot becomes about 150 KB, which TVs load quickly. */

const MAX_SIDE = 800;
const QUALITY = 0.82;
/** A whole menu keeps more detail: about 1568 px on the long side is what the reading model sees best. */
const MENU_STEPS = [
  { maxSide: 1568, quality: 0.85 },
  { maxSide: 1568, quality: 0.7 },
  { maxSide: 1280, quality: 0.7 },
] as const;

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Some browsers can't decode every format this way; fall back to an image element below.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function shrinkPhoto(file: Blob, { maxSide = MAX_SIDE, quality = QUALITY } = {}): Promise<Blob> {
  const image = await decode(file);
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser can’t prepare photos.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  if ('close' in image) image.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The photo couldn’t be prepared.'))), 'image/jpeg', quality));
}

/** A photo of the menu, as sharp as fits under `maxBytes`: dense menus step down in quality, then size. */
export async function shrinkMenuPhoto(file: Blob, maxBytes: number): Promise<Blob> {
  for (const step of MENU_STEPS) {
    const blob = await shrinkPhoto(file, step);
    if (blob.size <= maxBytes) return blob;
  }
  throw new Error('This photo is too large to send. Try another photo.');
}
