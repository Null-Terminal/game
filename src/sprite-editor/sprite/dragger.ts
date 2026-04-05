import type { Sprite } from "#sprite-editor/sprite";

export interface PointerPosition {
  x: number;
  y: number;
}

export class SpriteDragger {
  readonly #sprite: Sprite;

  #offsetX = 0;
  #offsetY = 0;
  #dragging = false;

  constructor(sprite: Sprite) {
    this.#sprite = sprite;
    this.#makeSpriteDraggable();
  }

  destroy() {
    this.#sprite.canvas.removeEventListener("keydown", this.#onArrowNavigation);
    this.#sprite.canvas.removeEventListener("pointerdown", this.#onDragSprite);
    window.removeEventListener("pointermove", this.#onDraggingSprite);
    window.removeEventListener("pointerup", this.#onDropSprite);
  }

  #makeSpriteDraggable() {
    this.#sprite.addEventListener("keydown", this.#onArrowNavigation);
    this.#sprite.canvas.addEventListener("pointerdown", this.#onDragSprite);
    window.addEventListener("pointermove", this.#onDraggingSprite, { passive: true });
    window.addEventListener("pointerup", this.#onDropSprite, { passive: true });
  }

  #isPointInsideImage(pointX: number, pointY: number): boolean {
    if (this.#sprite.image == null) {
      return false;
    }

    const { x, y, imageWidth, imageHeight } = this.#sprite;

    const right = x + imageWidth;
    const bottom = y + imageHeight;

    return pointX >= x && pointX <= right && pointY >= y && pointY <= bottom;
  }

  #getPointerPosition(e: PointerEvent): PointerPosition {
    const { canvas } = this.#sprite;

    const rect = canvas.getBoundingClientRect();

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  readonly #onArrowNavigation = (e: KeyboardEvent) => {
    if (!e.key.startsWith("Arrow")) {
      return;
    }

    e.preventDefault();

    switch (e.key) {
      case "ArrowUp":
        this.#sprite.y--;
        break;

      case "ArrowDown":
        this.#sprite.y++;
        break;

      case "ArrowLeft":
        this.#sprite.x--;
        break;

      case "ArrowRight":
        this.#sprite.x++;
        break;
    }
  };

  readonly #onDragSprite = (e: PointerEvent) => {
    e.preventDefault();

    const { canvas } = this.#sprite;
    const { x, y } = this.#getPointerPosition(e);

    canvas.focus();

    if (this.#isPointInsideImage(x, y)) {
      this.#dragging = true;

      this.#offsetX = this.#sprite.x - x;
      this.#offsetY = this.#sprite.y - y;

      canvas.style.cursor = "grabbing";
      canvas.setPointerCapture(e.pointerId);
    }
  };

  readonly #onDraggingSprite = (e: PointerEvent) => {
    if (!this.#dragging) {
      return;
    }

    const { x, y } = this.#getPointerPosition(e);

    this.#sprite.x = x + this.#offsetX;
    this.#sprite.y = y + this.#offsetY;
  };

  readonly #onDropSprite = (e: PointerEvent) => {
    if (!this.#dragging) {
      return;
    }

    const { canvas } = this.#sprite;

    canvas.style.cursor = "grab";
    canvas.releasePointerCapture(e.pointerId);

    this.#dragging = false;
  };
}
