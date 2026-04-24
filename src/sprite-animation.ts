export type * from "#/sprite-animation/types";

import type { Sprite } from "#sprite-editor/sprite";
import type { MergedSprite, SpriteDescriptor } from "#/sprite-animation/types";

export class SpriteAnimation {
  static fromJSON(json: string): SpriteAnimation {
    const data = JSON.parse(json);

    if (typeof data !== "object" || !("sprites" in data) || !Array.isArray(data.sprites)) {
      throw new TypeError("Invalid data type");
    }

    return new SpriteAnimation(data.sprites);
  }

  static mergeSprites(sprites: Sprite[]): MergedSprite {
    // Вычисляем общую ширину и максимальную высоту
    let totalWidth = 0;
    let maxHeight = 0;

    for (const { canvas } of sprites) {
      totalWidth += canvas.width;
      maxHeight = Math.max(maxHeight, canvas.height);
    }

    // Создаем результирующий canvas
    const resultCanvas = document.createElement("canvas");
    const resultCtx = resultCanvas.getContext("2d")!;

    resultCanvas.width = totalWidth;
    resultCanvas.height = maxHeight;

    const spriteDescriptors = new Array(sprites.length).fill(undefined);

    let currentX = 0;

    for (let i = 0; i < sprites.length; i++) {
      const sprite = sprites[i]!;

      // Создаем временный canvas, чтобы отрисовать туда изображение без сетки
      const image = sprite.canvas.cloneNode() as HTMLCanvasElement;
      sprite.draw(image.getContext("2d")!);
      resultCtx.drawImage(image, currentX, 0);

      spriteDescriptors[i] = {
        x: currentX,
        y: 0,
        width: image.width,
        height: image.height,
        animationDelay: sprite.animationDelay,
        spriteId: sprite.spriteId
      };

      currentX += sprite.canvas.width;
    }

    return { canvas: resultCanvas, data: new SpriteAnimation(spriteDescriptors) } as MergedSprite;
  }

  get length(): number {
    return this.sprites.length;
  }

  protected readonly sprites: SpriteDescriptor[];

  constructor(sprites: SpriteDescriptor[]) {
    this.sprites = sprites;
  }

  at(index: number): Readonly<SpriteDescriptor> | undefined {
    return this.sprites.at(index);
  }

  toDataURL() {
    const data = encodeURIComponent(JSON.stringify({ sprites: this.sprites }));
    return `data:application/json,${data}`;
  }

  [Symbol.iterator]() {
    return this.sprites.values();
  }
}
