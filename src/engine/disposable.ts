export abstract class Disposable {
  readonly #destructors: Function[] = [];
  #abortController = new AbortController();

  get abortSignal() {
    return this.#abortController.signal;
  }

  register<T extends () => void>(destructor: T): T {
    this.#destructors.push(destructor);
    return destructor;
  }

  nextTick(cb: () => void): () => void {
    let executed = false;

    queueMicrotask(() => {
      if (!executed) {
        cb();
      }
    });

    return this.register(() => {
      executed = true;
    });
  }

  destroy() {
    const destructors = this.#destructors.splice(0);

    for (let i = destructors.length; i--;) {
      destructors[i]!();
    }

    this.#abortController.abort();
    this.#abortController = new AbortController();
  }

  [Symbol.dispose]() {
    this.destroy();
  }
}
