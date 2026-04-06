import type { Sprite } from "#sprite-editor/sprite";

type ResizeType = "ns-resize" | "nw-resize" | "w-resize";

export class SpriteResizer {
  readonly #sprite: Sprite;

  #resizing: ResizeType | null = null;
  #resizeStartX = 0;
  #resizeStartY = 0;

  #startWidth = 0;
  #startHeight = 0;

  constructor(sprite: Sprite) {
    this.#sprite = sprite;
    this.#makeCanvasResizable();
  }

  destroy() {
    window.removeEventListener("pointermove", this.#onResizeMove);
    window.removeEventListener("pointerup", this.#onResizeEnd);
  }

  #makeCanvasResizable() {
    const { sprite, options } = this.#sprite;
    const { handleSize } = options;

    const right = `-${Math.round(handleSize / 3)}px`;
    const bottom = `-${Math.round(handleSize / 6)}px`;
    const center = `calc(50% - ${Math.round(handleSize / 2)}px)`;

    const handles = [
      { right: center , bottom, cursor: "ns-resize" },
      { right , bottom, cursor: "nw-resize" },
      { right , bottom: center, cursor: "w-resize" },
    ] as const;

    for (const style of handles) {
      const handle = document.createElement("div");

      handle.classList.add("resize-handle");

      Object.assign(handle.style, {
        width: `${handleSize}px`,
        height: `${handleSize}px`,
        backgroundColor: options.handlerColor,
        ...style
      });

      handle.addEventListener("pointerdown", this.#onResizeStart.bind(this, style.cursor));
      sprite.append(handle);
    }

    window.addEventListener("pointermove", this.#onResizeMove);
    window.addEventListener("pointerup", this.#onResizeEnd);
  }

  #onResizeStart(type: ResizeType, e: PointerEvent) {
    e.preventDefault();

    const { canvas } = this.#sprite;

    this.#resizing = type;
    this.#resizeStartX = e.clientX;
    this.#resizeStartY = e.clientY;

    this.#startWidth = canvas.width;
    this.#startHeight = canvas.height;

    canvas.style.cursor = type;
  }

  readonly #onResizeMove = (e: PointerEvent) => {
    if (this.#resizing == null) {
      return;
    }

    const deltaX = e.clientX - this.#resizeStartX;
    const deltaY = e.clientY - this.#resizeStartY;

    const newWidth = Math.max(50, this.#startWidth + deltaX);
    const newHeight = Math.max(50, this.#startHeight + deltaY);

    if (this.#resizing === "nw-resize" || this.#resizing === "w-resize") {
      this.#sprite.width = newWidth;
    }

    if (this.#resizing === "nw-resize" || this.#resizing === "ns-resize") {
      this.#sprite.height = newHeight;
    }
  };

  readonly #onResizeEnd = () => {
    if (this.#resizing == null) {
      return;
    }

    this.#resizing = null;
    this.#sprite.canvas.style.cursor = "grab";
    this.#sprite.history.saveState();
  };
}
