import { Handlers } from "#sprite-editor/handlers";

import type { Sprite } from "#sprite-editor/sprite";

export class ActionHandlers extends Handlers<Sprite> {
  constructor(parent: Sprite) {
    super(parent);
  }

  destroy(): void {
    this.parent.controls.removeEventListener("click", this.onClick);
  }

  deleteSprite() {
    const { host } = this.parent;

    host.style.opacity = "0";

    host.addEventListener("transitionend", () => {
      this.parent.remove();
    }, {
      once: true,
    });
  }

  copyLeftSize() {
    const currentSprite = this.parent;

    let leftSprite: Element | null = currentSprite;

    do {
      leftSprite = leftSprite.previousElementSibling;

      if (leftSprite instanceof (currentSprite.constructor as typeof Sprite)) {
        currentSprite.resize(leftSprite.canvas.width, leftSprite.canvas.height);
        break;
      }

    } while (leftSprite !== null);
  }

  copyRightSize() {
    const currentSprite = this.parent;

    let rightSprite: Element | null = currentSprite;

    do {
      rightSprite = rightSprite.nextElementSibling;

      if (rightSprite instanceof (currentSprite.constructor as typeof Sprite)) {
        currentSprite.resize(rightSprite.canvas.width, rightSprite.canvas.height);
        break;
      }

    } while (rightSprite !== null);
  }

  protected initHandlers() {
    this.parent.controls.addEventListener("click", this.onClick);
  }
}
