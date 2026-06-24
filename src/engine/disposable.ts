export abstract class Disposable {
  readonly #destructors: Function[] = [];

  register(destructor: Function) {
    this.#destructors.push(destructor);
  }

  destroy() {
    this.#destructors.splice(0, this.#destructors.length).forEach((destroy) => destroy());
  }

  [Symbol.dispose]() {
    this.destroy();
  }
}
