import type { LoadSpriteOptions } from "#engine/animation-loader/types";
import { removeCanvasBackground } from "#engine/animation-loader/remove-background";

const spriteCache = new Map<string, Promise<ImageBitmap>>();

export function loadSprite(url: string, options: LoadSpriteOptions = {}): Promise<ImageBitmap> {
  const { removeBackground = false, tolerance = 5 } = options ?? {};

  const cacheKey = [url, removeBackground, tolerance].join("_");

  const fromCache = spriteCache.get(cacheKey);

  if (fromCache != null) {
    return fromCache;
  }

  const { promise, resolve, reject } = Promise.withResolvers<ImageBitmap>();

  spriteCache.set(cacheKey, promise);

  const img = new Image();

  img.onload = () => {
    try {
      const canvas = new OffscreenCanvas(img.width, img.height);
      canvas.getContext("2d")!.drawImage(img, 0, 0);

      if (removeBackground) {
        removeCanvasBackground(canvas, removeBackground, tolerance);
      }

      resolve(createImageBitmap(canvas));

    } catch (err) {
      reject(err);
    }
  };

  img.onerror = () => {
    reject(new Error(`Failed to load sprite ${url}`));
  };

  img.src = url;

  return promise;
}
