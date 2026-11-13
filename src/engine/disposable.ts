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

  readonly #destructors: Destructor[] = [];
  #abortController = new AbortController();

  onDestroy<T extends Destructor>(destructor: T): T {
    this.#destructors.push(destructor);
    return destructor;
  }

  nextTick(cb: () => void): Destructor {
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
    const errors: unknown[] = [];

    for (let i = destructors.length; i--;) {
      try {
        destructors[i]!();

      } catch (err) {
        errors.push(err);
      }
    }

    this.#abortController.abort();
    this.#abortController = new AbortController();

    if (errors.length === 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new AggregateError(errors, `${this.constructor.name}: destroy failed`);
    }
  }

  [Symbol.dispose]() {
    this.destroy();
  }
}
