type Cleanup = Destructor | Disposable;

export abstract class Destroyable implements Disposable {
  get abortSignal() {
    return this.#abortController.signal;
  }

  get destroyed() {
    return this.#destroyed;
  }

  #destroyed = false;

  readonly #destructors: Destructor[] = [];
  #abortController = new AbortController();

  constructor(destroyed = false) {
    this.#destroyed = destroyed;
  }

  protected revive() {
    this.#destroyed = false;
  }

  onDestroy<T extends Cleanup | null | undefined>(cleanup: T): T {
    if (cleanup == null) {
      return cleanup;
    }

    this.#destructors.push(typeof cleanup === "function" ? cleanup : () => cleanup[Symbol.dispose]());
    return cleanup;
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.#destroyed = true;

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
