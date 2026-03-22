import type { Sprite } from "#sprite-editor/sprite";

export interface PointerPosition {
  x: number;
  y: number;
}

export class SpriteDragger {
  readonly #sprite: Sprite;

  #offsetX: number = 0;
  #offsetY: number = 0;

  #dragging: boolean = false;

  constructor(sprite: Sprite) {
    this.#sprite = sprite;
    this.#makeSpriteDraggable();
  }

  destroy() {
    this.#sprite.canvas.removeEventListener("pointerdown", this.#onDragSprite);
    window.removeEventListener("pointermove", this.#onDraggingSprite);
    window.removeEventListener("pointerup", this.#onDropSprite);
  }

  #makeSpriteDraggable() {
    this.#sprite.canvas.addEventListener("pointerdown", this.#onDragSprite);
    window.addEventListener("pointermove", this.#onDraggingSprite, { passive: true });
    window.addEventListener("pointerup", this.#onDropSprite, { passive: true });
  }

  #isPointInsideImage(pointX: number, pointY: number): boolean {
    if (this.#sprite.image == null) {
      return false;
    }

    const { x, y, imageWidth, imageHeight } = this.#sprite;

    const left = x - imageWidth / 2;
    const right = x + imageWidth / 2;
    const top = y - imageHeight / 2;
    const bottom = y + imageHeight / 2;

    return pointX >= left && pointX <= right && pointY >= top && pointY <= bottom;
  }

  #getPointerPosition(e: PointerEvent): PointerPosition {
    const { canvas } = this.#sprite;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  #onDragSprite = (e: PointerEvent) => {
    e.preventDefault();

    const { canvas } = this.#sprite;
    const { x, y } = this.#getPointerPosition(e);

    if (this.#isPointInsideImage(x, y)) {
      this.#dragging = true;

      this.#offsetX = this.#sprite.x - x;
      this.#offsetY = this.#sprite.y - y;

      canvas.style.cursor = "grabbing";
      canvas.setPointerCapture(e.pointerId);
    }
  };

  #onDraggingSprite = (e: PointerEvent) => {
    if (!this.#dragging) {
      return;
    }

    const { x, y } = this.#getPointerPosition(e);

    this.#sprite.x = x + this.#offsetX;
    this.#sprite.y = y + this.#offsetY;

    this.#sprite.draw();
  };

  #onDropSprite = (e: PointerEvent) => {
    if (!this.#dragging) {
      return;
    }

    const { canvas } = this.#sprite;

    canvas.style.cursor = "grab";
    canvas.releasePointerCapture(e.pointerId);

    this.#dragging = false;
  };
}
