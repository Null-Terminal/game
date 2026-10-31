export class SeededRandom {
  #state;

  constructor(seed: number) {
    this.#state = seed >>> 0;
  }

  reset(seed: number) {
    this.#state = seed >>> 0;
  }

  next() {
    // Линейный конгруэнтный генератор с 32-битным состоянием
    this.#state = (Math.imul(this.#state, 1664525) + 1013904223) >>> 0;
    return this.#state / 0x100000000;
  }

  values() {
    return Iterator.from({
      next: () => ({ value: this.next(), done: false })
    });
  }

  [Symbol.iterator]() {
    return this.values();
  }
}
