import type { Sprite } from "#sprite-editor/sprite";

type ResizeType = "ns-resize" | "nw-resize" | "w-resize";

export class SpriteResizer {
  readonly #sprite: Sprite;

  #resizing: ResizeType | null = null;
  #resizeStartX: number = 0;
  #resizeStartY: number = 0;

  #startWidth: number = 0;
  #startHeight: number = 0;

  constructor(sprite: Sprite) {
    this.#sprite = sprite;
    this.#makeCanvasResizable();
  }

  #makeCanvasResizable(): void {
    const { container, options } = this.#sprite;
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
      container.append(handle);
    }

    window.addEventListener("pointermove", this.#onResizeMove.bind(this));
    window.addEventListener("pointerup", this.#onResizeEnd.bind(this));
  }

  #onResizeStart(type: ResizeType, e: PointerEvent): void {
    e.preventDefault();

    const { canvas } = this.#sprite;

    this.#resizing = type;
    this.#resizeStartX = e.clientX;
    this.#resizeStartY = e.clientY;

    this.#startWidth = canvas.width;
    this.#startHeight = canvas.height;

    canvas.style.cursor = type;
  }

  #onResizeMove(e: PointerEvent): void {
    if (!this.#resizing) {
      return;
    }

    const { canvas } = this.#sprite;

    const deltaX = e.clientX - this.#resizeStartX;
    const deltaY = e.clientY - this.#resizeStartY;

    const newWidth = Math.max(100, this.#startWidth + deltaX);
    const newHeight = Math.max(100, this.#startHeight + deltaY);

    if (this.#resizing === "nw-resize" || this.#resizing === "w-resize") {
      canvas.width = newWidth;
      this.#sprite.x = canvas.width / 2;
    }

    if (this.#resizing === "nw-resize" || this.#resizing === "ns-resize") {
      canvas.height = newHeight;
      this.#sprite.y = canvas.height / 2;
    }

    this.#sprite.draw();
  }

  #onResizeEnd(): void {
    this.#resizing = null;
    this.#sprite.canvas.style.cursor = "grab";
  }
}
