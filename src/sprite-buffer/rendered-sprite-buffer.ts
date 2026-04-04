import { SpriteBuffer } from "#/sprite-buffer/sprite-buffer";
import type { Sprite } from "#sprite-editor/sprite";

const U8 = Uint8Array.BYTES_PER_ELEMENT;

export class RenderedSpriteBuffer {
  static readonly SCHEME = new Map([
    ["length", U8],
    ["repeat", U8],
    ["sprite", SpriteBuffer.BYTES_PER_ELEMENT],
  ] as const);

  static readonly HEADER_SIZE = this.SCHEME.entries()
    .flatMap(([key, size]) => key === "sprite" ? [] : [size])
    .reduce((acc, size) => acc + size, 0);

  readonly HEADER_SIZE = RenderedSpriteBuffer.HEADER_SIZE;

  static newBlank(size: number, repeat: number = 0xFF): RenderedSpriteBuffer {
    const buffer = new RenderedSpriteBuffer(new Uint8Array(size * SpriteBuffer.BYTES_PER_ELEMENT + this.HEADER_SIZE));

    buffer.size = size;
    buffer.repeat = repeat;

    return buffer;
  }

  static mergeSprites(sprites: Sprite[], repeat?: number): { canvas: HTMLCanvasElement; data: RenderedSpriteBuffer } {
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

    const data = this.newBlank(sprites.length, repeat);

    let currentX = 0;

    for (let i = 0; i < sprites.length; i++) {
      const sprite = sprites[i]!;

      // Создаем временный canvas, чтобы отрисовать туда изображение без сетки
      const image = sprite.canvas.cloneNode() as HTMLCanvasElement;
      sprite.draw(image.getContext("2d")!);

      // Вычисляем позицию по Y для центрирования по вертикали
      const y = (maxHeight - sprite.canvas.height) / 2;
      resultCtx.drawImage(image, currentX, y);

      const spriteBuffer = data.at(i)!;

      spriteBuffer.x = -currentX;
      spriteBuffer.y = -y;
      spriteBuffer.width = image.width;
      spriteBuffer.height = image.height;
      spriteBuffer.animationDelay = sprite.animationDelay;
      spriteBuffer.spriteId = sprite.spriteId;

      currentX += sprite.canvas.width;
    }

    return { canvas: resultCanvas, data };
  }

  get buffer() {
    return this.#bytes.buffer;
  }

  get byteLength() {
    return this.#bytes.byteLength;
  }

  #bytes;

  constructor(bytes: Uint8Array) {
    this.#bytes = bytes;
  }

  get size() {
    return this.#bytes[0]!;
  }

  set size(value: number) {
    this.#bytes[0] = value;
  }

  get repeat() {
    return this.#bytes[1]!;
  }

  set repeat(value: number) {
    this.#bytes[1] = value;
  }

  at(index: number): SpriteBuffer | null {
    const normalizedIndex = index < 0 ? this.size - index : index;

    if (normalizedIndex < 0 || normalizedIndex >= this.size) {
      return null;
    }

    return new SpriteBuffer(this.#bytes, this.HEADER_SIZE + index * SpriteBuffer.BYTES_PER_ELEMENT);
  }

  toDataURL() {
    return `data:application/octet-stream;base64,${this.#bytes.toBase64()}`;
  }
}
