import type { Sprite } from "#sprite-editor/sprite";

export class ActionHandlers {
  readonly #sprite: Sprite;

  constructor(sprite: Sprite) {
    this.#sprite = sprite;
    this.#initHandlers();
  }

  destroy(): void {
    this.#sprite.container.removeEventListener("click", this.#onClick);
  }

  deleteSprite() {
    const { container } = this.#sprite;

    container.style.opacity = "0";

    container.addEventListener("transitionend", () => {
      this.#sprite.destroy();
    }, {
      once: true,
    });
  }

  copyLeftSize() {
    const currentSprite = this.#sprite;

    const leftSprite = currentSprite.getContext(this.#sprite.container.previousElementSibling);

    if (leftSprite != null) {
      currentSprite.resize(leftSprite.canvas.width, leftSprite.canvas.height);
    }
  }

  copyRightSize() {
    const currentSprite = this.#sprite;

    const leftSprite = currentSprite.getContext(this.#sprite.container.nextElementSibling);

    if (leftSprite != null) {
      currentSprite.resize(leftSprite.canvas.width, leftSprite.canvas.height);
    }
  }

  #initHandlers() {
    this.#sprite.container.addEventListener("click", this.#onClick);
  }

  #onClick = (e: PointerEvent) => {
    const { target } = e;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.closest<HTMLElement>("[data-action]")?.dataset["action"] ?? "unknown";

    if (action in this) {
      e.preventDefault();
      this[action as keyof ActionHandlers]();
    }
  };
}
