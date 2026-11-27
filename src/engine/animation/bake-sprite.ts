import { removeCanvasBackground } from "#engine/animation/remove-background";
import type { SpriteLoadData } from "#engine/animation/types";

export async function bakeSprite({ headers, data, options }: SpriteLoadData): Promise<ImageBitmap> {
  const blob = new Blob([data], { type: headers.contentType });

  const image = await createImageBitmap(blob);

  if (!options.removeBackground) {
    return image;
  }

  const canvas = new OffscreenCanvas(image.width, image.height);

  try {
    canvas.getContext("2d")!.drawImage(image, 0, 0);

  } finally {
    image.close();
  }

  removeCanvasBackground(canvas, options.removeBackground, options.tolerance ?? 5);

  return canvas.transferToImageBitmap();
}
