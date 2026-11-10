export const PORTRAIT_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const PORTRAIT_MAX_BYTES = 2 * 1024 * 1024;
export const PORTRAIT_MAX_PX = 512;

export function checkPortraitFile(file: File): string | null {
  if (!PORTRAIT_TYPES.includes(file.type)) return 'Choose a PNG, JPG or WebP image.';
  if (file.size > PORTRAIT_MAX_BYTES) return 'Choose an image of 2 MB or less.';
  return null;
}

/** Decodes the image and returns a data URL no larger than 512px on its longest side. */
export async function portraitDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('This image could not be read.'));
      el.src = url;
    });
    const scale = Math.min(1, PORTRAIT_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot resize images.');
    ctx.drawImage(img, 0, 0, w, h);
    const webp = canvas.toDataURL('image/webp', 0.85);
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
