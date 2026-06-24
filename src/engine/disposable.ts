export abstract class Disposable {
  readonly #destructors: Function[] = [];

  register<T extends () => void>(destructor: T): T {
    this.#destructors.push(destructor);
    return destructor;
  }

  destroy() {
    this.#destructors.splice(0, this.#destructors.length).forEach((destroy) => destroy());
  }

  [Symbol.dispose]() {
    this.destroy();
  }
}
