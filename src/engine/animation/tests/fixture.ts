import { AnimationDefinition } from "#/animation-definition";

import { LoadedAnimation } from "#engine/animation/loaded-animation";

export interface FrameScene {
  animation: LoadedAnimation;
  pixel(image: ImageBitmap, x: number, y: number): number[];
  destroy(): void;
}

export function createFrameScene(): FrameScene {
  const source = new OffscreenCanvas(4, 4);
  const ctx = source.getContext("2d")!;

  const colors = [
    ["#FF0000", "#00FF00"],
    ["#0000FF", "#FFFF00"]
  ];

  for (const [row, columns] of colors.entries()) {
    for (const [column, color] of columns.entries()) {
      ctx.fillStyle = color;
      ctx.fillRect(column * 2, row * 2, 2, 2);
    }
  }

  const image = source.transferToImageBitmap();
  const definition = new AnimationDefinition({
    sprites: [{ x: 0, y: 0, width: 4, height: 4, duration: 100, spriteId: "" }],
    params: {
      repeat: { width: { x: 0, y: 0, width: 2, height: 2 } }
    }
  });

  const animation = new LoadedAnimation(image, definition);

  return {
    animation,

    pixel(frame, x, y) {
      const sample = new OffscreenCanvas(frame.width, frame.height);
      const context = sample.getContext("2d")!;

      context.drawImage(frame, 0, 0);
      return Array.from(context.getImageData(x, y, 1, 1).data.slice(0, 3));
    },

    destroy() {
      image.close();
    }
  };
}
