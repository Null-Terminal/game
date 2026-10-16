export abstract class Disposable {
  get abortSignal() {
    return this.#abortController.signal;
  }

  get destroyed() {
    return this.#destroyed;
  }

  protected set destroyed(value: boolean) {
    this.#destroyed = value;
  }

  #destroyed = false;

  readonly #destructors: Function[] = [];
  #abortController = new AbortController();

  onDestroy<T extends () => void>(destructor: T): T {
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

    return this.onDestroy(() => {
      executed = true;
    });
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

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
