const spriteCache = new Map<string, Promise<OffscreenCanvas>>();

export interface LoadSpriteOptions {
  tolerance?: number;
}

export function loadSprite(url: string, options: LoadSpriteOptions = {}): Promise<OffscreenCanvas> {
  const { tolerance = 0 } = options ?? {};

  const cacheKey = [url, removeBackground, tolerance].join("_");

  const fromCache = spriteCache.get(cacheKey);

  if (fromCache != null) {
    return fromCache;
  }

  const { promise, resolve, reject } = Promise.withResolvers<OffscreenCanvas>();

  spriteCache.set(cacheKey, promise);

  const img = new Image();

  img.onload = () => {
    try {
      const canvas = new OffscreenCanvas(img.width, img.height);

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      removeBackground(canvas, tolerance);
      resolve(canvas);

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

function removeBackground(canvas: OffscreenCanvas, tolerance = 30) {
  const ctx = canvas.getContext("2d")!;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  if (data.length < 4) {
    return;
  }

  // Определяем цвет фона из левого верхнего угла
  const targetColor = {
    r: data[0]!,
    g: data[1]!,
    b: data[2]!,
    alpha: data[3]!,
  };

  if (targetColor.alpha === 0) {
    return;
  }

  // Заливка фона
  for (let i = 0; i < data.length; i += 4) {
    const diffR = Math.abs(data[i]! - targetColor.r);
    const diffG = Math.abs(data[i + 1]! - targetColor.g);
    const diffB = Math.abs(data[i + 2]! - targetColor.b);

    if (diffR <= tolerance && diffG <= tolerance && diffB <= tolerance) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
