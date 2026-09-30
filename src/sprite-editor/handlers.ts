export abstract class Handlers<Parent> {
  protected readonly parent: Parent;

  readonly attr: string = "action";

  #destroyed = false;

  protected constructor(parent: Parent) {
    this.parent = parent;

    queueMicrotask(() => {
      if (!this.#destroyed) {
        this.initHandlers();
      }
    });
  }

  destroy() {
    this.#destroyed = true;
  }

  protected abstract initHandlers(): void;

  protected readonly onAction = (e: Event) => {
    const { target } = e;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.closest<HTMLElement>(`[data-${this.attr}]`)?.dataset[this.attr] ?? "unknown";

    if (action in this) {
      const method = action as keyof this;

      if (typeof this[method] === "function") {
        this[method](e);
      }
    }
  };
}
