export abstract class Handlers<T> {
  protected readonly parent: T;

  readonly attr: string = "action";

  protected constructor(parent: T) {
    this.parent = parent;

    queueMicrotask(() => {
      this.initHandlers();
    });
  }

  protected abstract initHandlers(): void;

  protected abstract destroy(): void;

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
