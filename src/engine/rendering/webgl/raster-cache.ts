import type { RGBAColor } from "#engine/rendering/webgl/types";

interface TextEntry {
  image: ImageBitmap;
  ascent: number;
}

const MAX_TEXT_ENTRIES = 128;

export class CanvasRasterCache {
  readonly #canvas = document.createElement("canvas");
  readonly #ctx = this.#canvas.getContext("2d", { willReadFrequently: true })!;

  readonly #releaseTexture;
  readonly #colors = new Map<string, RGBAColor>();
  readonly #text = new Map<string, TextEntry>();

  constructor(releaseTexture: (image: ImageBitmap) => void) {
    this.#releaseTexture = releaseTexture;
  }

  color(value: string): RGBAColor {
    const cached = this.#colors.get(value);

    if (cached != null) {
      return cached;
    }

    this.#ctx.fillStyle = value;
    this.#ctx.clearRect(0, 0, 1, 1);
    this.#ctx.fillRect(0, 0, 1, 1);

    const rgba = this.#ctx.getImageData(0, 0, 1, 1).data;
    const color: RGBAColor = [rgba[0]! / 255, rgba[1]! / 255, rgba[2]! / 255, rgba[3]! / 255];
    this.#colors.set(value, color);

    return color;
  }

  measureText(text: string, font: string): TextMetrics {
    this.#ctx.font = font;
    return this.#ctx.measureText(text);
  }

  textImage(text: string, font: string, fill: string): TextEntry {
    const key = `${font}|${fill}|${text}`;
    const cached = this.#text.get(key);

    if (cached != null) {
      this.#text.delete(key);
      this.#text.set(key, cached);
      return cached;
    }

    const metrics = this.measureText(text, font);
    const ascent = Math.ceil(metrics.actualBoundingBoxAscent);

    const width = Math.max(1, Math.ceil(metrics.width) + 2);
    const height = Math.max(1, ascent + Math.ceil(metrics.actualBoundingBoxDescent) + 2);

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d")!;

    ctx.font = font;
    ctx.fillStyle = fill;
    ctx.fillText(text, 1, ascent + 1);

    const entry = { image: canvas.transferToImageBitmap(), ascent };
    this.#text.set(key, entry);

    if (this.#text.size > MAX_TEXT_ENTRIES) {
      const oldest = this.#text.keys().next().value!;
      const removed = this.#text.get(oldest)!;

      this.#text.delete(oldest);
      this.#releaseTexture(removed.image);

      removed.image.close();
    }

    return entry;
  }

  destroy() {
    for (const { image } of this.#text.values()) {
      this.#releaseTexture(image);
      image.close();
    }

    this.#text.clear();
    this.#colors.clear();
  }
}
