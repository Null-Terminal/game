import type { BackdropImage, BackdropImagePosition, BackdropLayoutOptions, BackdropOrder } from "#engine/game-objects/backdrop-object/types";

export class BackdropLayout {
  get positions(): readonly BackdropImagePosition[] {
    return this.#positions;
  }

  readonly #images: readonly BackdropImage[];
  readonly #order: BackdropOrder;

  readonly #minGap: number;
  readonly #maxGap: number;

  readonly #positions: BackdropImagePosition[] = [];
  readonly #shuffledIndices: number[] = [];

  #nextX: number;
  #roundRobinIndex = 0;
  #randomState: number;

  constructor(images: readonly BackdropImage[], startX: number, opts: BackdropLayoutOptions) {
    const hasInvalidImages =
      images.length === 0 ||
      images.some((image) => !Number.isFinite(image.width) || image.width <= 0);

    if (hasInvalidImages) {
      throw new RangeError("Backdrop image widths must be positive finite numbers");
    }

    const { order = "shuffle", gap = -1, seed } = opts;

    const minGap = typeof gap === "number" ? gap : gap[0];
    const maxGap = typeof gap === "number" ? gap : gap[1];

    const hasInvalidGap = !Number.isFinite(minGap) || !Number.isFinite(maxGap) || minGap > maxGap;

    if (hasInvalidGap) {
      throw new RangeError("Backdrop gap must be a finite number or an ascending range");
    }

    this.#images = images;
    this.#order = order;

    this.#minGap = minGap;
    this.#maxGap = maxGap;

    this.#nextX = startX;
    this.#randomState = seed >>> 0;
  }

  extendTo(endX: number) {
    while (this.#nextX < endX) {
      const index = this.#selectNextImageIndex();
      const width = this.#images[index]!.width;

      if (this.#nextX + width > 0) {
        this.#positions.push({ index, x: this.#nextX });
      }

      const gap = this.#minGap === this.#maxGap ?
        this.#minGap : this.#minGap + this.#random() * (this.#maxGap - this.#minGap);

      // Даже при отрицательном промежутке следующая позиция должна быть правее текущей.
      this.#nextX += Math.max(1, width + gap);
    }
  }

  #selectNextImageIndex(): number {
    switch (this.#order) {
      case "random": {
        return Math.floor(this.#random() * this.#images.length);
      }

      case "round-robin": {
        const index = this.#roundRobinIndex;
        this.#roundRobinIndex = (index + 1) % this.#images.length;
        return index;
      }

      default: {
        if (this.#shuffledIndices.length === 0) {
          this.#refillShuffledIndices();
        }

        return this.#shuffledIndices.pop()!;
      }
    }
  }

  #refillShuffledIndices() {
    for (let i = 0; i < this.#images.length; i++) {
      this.#shuffledIndices.push(i);
    }

    for (let i = this.#shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(this.#random() * (i + 1));
      const current = this.#shuffledIndices[i]!;

      this.#shuffledIndices[i] = this.#shuffledIndices[j]!;
      this.#shuffledIndices[j] = current;
    }
  }

  #random(): number {
    // Линейный конгруэнтный генератор: новое состояние вычисляется по модулю 2³²
    this.#randomState = (Math.imul(this.#randomState, 1664525) + 1013904223) >>> 0;
    return this.#randomState / 0x100000000;
  }
}
