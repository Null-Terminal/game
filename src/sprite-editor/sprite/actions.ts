import { Handlers } from "#sprite-editor/handlers";

import type { Sprite } from "#sprite-editor/sprite";

export class ActionHandlers extends Handlers<Sprite> {
  constructor(parent: Sprite) {
    super(parent);
  }

  destroy(): void {
    this.parent.controls.removeEventListener("click", this.onAction);
    this.parent.controls.removeEventListener("input", this.onAction);
  }

  addNew() {
    const currentSprite = this.parent;
    currentSprite.insertAdjacentElement("afterend", currentSprite.copy());
  }

  deleteCurrent() {
    const { host } = this.parent;
    host.style.opacity = "0";

    host.addEventListener("transitionend", () => {
      host.style.opacity = "";
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
        currentSprite.history.saveState();
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
        currentSprite.history.saveState();
        break;
      }

    } while (rightSprite !== null);
  }

  moveLeft() {
    const currentSprite = this.parent;
    currentSprite.previousElementSibling?.insertAdjacentElement("beforebegin", currentSprite);
  }

  moveRight() {
    const currentSprite = this.parent;
    currentSprite.nextElementSibling?.insertAdjacentElement("afterend", currentSprite);
  }

  setX(e: Event) {
    this.parent.x = parseInt((e.target as HTMLInputElement).value, 10);
    this.parent.history.saveState();
  }

  setY(e: Event) {
    this.parent.y = parseInt((e.target as HTMLInputElement).value, 10);
    this.parent.history.saveState();
  }

  setWidth(e: Event) {
    this.parent.width = parseInt((e.target as HTMLInputElement).value, 10);
    this.parent.history.saveState();
  }

  setHeight(e: Event) {
    this.parent.width = parseInt((e.target as HTMLInputElement).value, 10);
    this.parent.history.saveState();
  }

  setId(e: Event) {
    this.parent.spriteId = (e.target as HTMLInputElement).value;
    this.parent.history.saveState();
  }

  setAnimationDelay(e: Event) {
    this.parent.animationDelay = parseInt((e.target as HTMLInputElement).value, 10);
    this.parent.history.saveState();
  }

  protected initHandlers() {
    this.parent.controls.addEventListener("click", this.onAction);
    this.parent.controls.addEventListener("input", this.onAction, { capture: true });
  }
}
