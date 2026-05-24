import type { Sprite } from "#sprite-editor/sprite";
import type { MergedSprite, SpriteDescriptor, TexturePacker } from "#/sprite-animation/types";

export type * from "#/sprite-animation/types";

export class SpriteAnimation {
  static fromJSON(json: string): SpriteAnimation {
    let data = JSON.parse(json);

    if ("frames" in data) {
      try {
        data = this.fromTexturePacker(data);

      } catch {
        throw new TypeError("TexturePacker: failed to parse - invalid format or malformed JSON");
      }
    }

    if (typeof data !== "object" || !("sprites" in data) || !Array.isArray(data.sprites)) {
      throw new TypeError(`Expected object with "sprites" array, got ${typeof data}${Array.isArray(data) ? " (array)" : ""}`);
    }

    return new SpriteAnimation(data.sprites);
  }

  static fromTexturePacker(data: TexturePacker): { sprites: SpriteDescriptor[] } {
    const sprites: SpriteDescriptor[] = [];

    for (const { frame, duration } of Object.values(data.frames)) {
      sprites.push({
        x: frame.x,
        y: frame.y,
        width: frame.w,
        height: frame.h,
        animationDelay: duration,
        spriteId: ""
      });
    }

    return { sprites };
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

    return { canvas: resultCanvas, animation: new SpriteAnimation(spriteDescriptors) } as MergedSprite;
  }

  get length(): number {
    return this.sprites.length;
  }

  protected readonly sprites: SpriteDescriptor[];

  constructor(sprites: SpriteDescriptor[]) {
    this.sprites = sprites;
  }

  isEmpty() {
    return this.sprites.length === 0;
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
