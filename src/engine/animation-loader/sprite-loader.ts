import type { LoadSpriteOptions } from "#engine/animation-loader/types";

const spriteCache = new Map<string, Promise<ImageBitmap>>();

export function loadSprite(url: string, options: LoadSpriteOptions = {}): Promise<ImageBitmap> {
  const { removeBackground = false, tolerance = 5 } = options ?? {};

  const cacheKey = [url, removeBackground && tolerance].join("_");

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

function removeCanvasBackground(canvas: OffscreenCanvas, color: string | boolean, tolerance: number) {
  const ctx = canvas.getContext("2d")!;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  if (data.length < 4) {
    return;
  }

  // Определяем цвет фона из левого верхнего угла
  let targetColor = new Uint8Array(data.buffer, 0, 4);

  // Либо цвет для удаления задан явно
  if (typeof color === "string") {
    targetColor = new Uint8Array(4).fill(255);
    targetColor.setFromHex(color.startsWith("#") ? color.slice(1) : color);
  }

  if (targetColor[3] === 0) {
    return;
  }

  // Заливка фона
  for (let i = 0; i < data.length; i += 4) {
    const diffR = Math.abs(data[i]! - targetColor[0]!);
    const diffG = Math.abs(data[i + 1]! - targetColor[1]!);
    const diffB = Math.abs(data[i + 2]! - targetColor[2]!);

    if (diffR <= tolerance && diffG <= tolerance && diffB <= tolerance) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
