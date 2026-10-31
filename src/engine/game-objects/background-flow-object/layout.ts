import { SeededRandom } from "#/utils/seeded-random";

import type { BackgroundFlowGap, BackgroundFlowOrder } from "#engine/game-objects/background-flow-object/types";

export interface FlowPosition {
  index: number;
  position: number;
}

interface FlowLayoutOptions {
  order?: BackgroundFlowOrder;
  gap?: BackgroundFlowGap;
  seed: number;
}

export class FlowLayout {
  get positions(): readonly FlowPosition[] {
    return this.#positions;
  }

  readonly #sizes: readonly number[];
  readonly #order: BackgroundFlowOrder;

  readonly #minGap: number;
  readonly #maxGap: number;

  readonly #positions: FlowPosition[] = [];
  readonly #shuffledIndices: number[] = [];
  readonly #random: SeededRandom;

  #nextPosition = 0;
  #roundRobinIndex = 0;

  constructor(sizes: readonly number[], opts: FlowLayoutOptions) {
    const hasInvalidSizes =
      sizes.length === 0 ||
      sizes.some((size) => !Number.isFinite(size) || size <= 0);

    if (hasInvalidSizes) {
      throw new RangeError("Background flow sizes must be positive finite numbers");
    }

    const { order = "shuffle", gap = -1, seed } = opts;

    const minGap = typeof gap === "number" ? gap : gap[0];
    const maxGap = typeof gap === "number" ? gap : gap[1];

    const hasInvalidGap = !Number.isFinite(minGap) || !Number.isFinite(maxGap) || minGap > maxGap;

    if (hasInvalidGap) {
      throw new RangeError("Background flow gap must be a finite number or an ascending range");
    }

    this.#sizes = sizes;
    this.#order = order;

    this.#minGap = minGap;
    this.#maxGap = maxGap;

    this.#random = new SeededRandom(seed);
  }

  extendTo(endPosition: number) {
    while (this.#nextPosition < endPosition) {
      const index = this.#selectNextIndex();
      const size = this.#sizes[index]!;

      if (this.#nextPosition + size > 0) {
        this.#positions.push({ index, position: this.#nextPosition });
      }

      const gap = this.#minGap === this.#maxGap ?
        this.#minGap : this.#minGap + this.#random.next() * (this.#maxGap - this.#minGap);

      // Даже при отрицательном промежутке следующая позиция должна быть дальше текущей.
      this.#nextPosition += Math.max(1, size + gap);
    }
  }

  #selectNextIndex(): number {
    switch (this.#order) {
      case "random": {
        return Math.floor(this.#random.next() * this.#sizes.length);
      }

      case "round-robin": {
        const index = this.#roundRobinIndex;
        this.#roundRobinIndex = (index + 1) % this.#sizes.length;
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
    for (let i = 0; i < this.#sizes.length; i++) {
      this.#shuffledIndices.push(i);
    }

    for (let i = this.#shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(this.#random.next() * (i + 1));
      const current = this.#shuffledIndices[i]!;

      this.#shuffledIndices[i] = this.#shuffledIndices[j]!;
      this.#shuffledIndices[j] = current;
    }
  }
}
