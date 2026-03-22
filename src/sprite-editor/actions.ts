import type { SpriteEditor } from "#/sprite-editor";

import { Sprite } from "#sprite-editor/sprite";
import { Handlers } from "#sprite-editor/handlers";

export class ActionHandlers extends Handlers<SpriteEditor> {
  constructor(parent: SpriteEditor) {
    super(parent);
  }

  destroy(): void {
    const { settings } = this.parent;

    settings.removeEventListener("click", this.onClick);
    settings.removeEventListener("submit", this.#onSubmit);
  }

  addToGrid() {
    const editor = this.parent;

    if (!editor.settings.checkValidity()) {
      return;
    }

    const sprite = editor.getSetting("sprite");
    const length = this.asNum(editor.getSetting("length"));

    const width = this.asNum(editor.getSetting("width"));
    const height = this.asNum(editor.getSetting("height"));

    for (let i = 1; i < length; i++) {
      editor.grid?.append(new Sprite(sprite.files![0]!, { width, height }));
    }
  }

  clearGrid() {
    this.parent.grid.innerHTML = "";
  }

  async renderGrid() {
    const editor = this.parent;

    if (!editor.settings.checkValidity()) {
      return;
    }

    const canvases = Array.from(editor.grid.querySelectorAll("sprite-item")) as Sprite[];

    const mergedCanvas = await mergeSprites(canvases);
    const link = document.createElement("a");

    link.download = editor.getSetting("name").value;
    link.href = mergedCanvas.toDataURL(`image/${editor.getSetting("ext").value}`);
    link.click();

    function mergeSprites(sprites: Sprite[]): Promise<HTMLCanvasElement> {
      return new Promise((resolve, reject) => {
        if (sprites.length === 0) {
          reject(new Error("No canvases provided"));
          return;
        }

        // Вычисляем общую ширину и максимальную высоту
        let totalWidth = 0;
        let maxHeight = 0;

        for (const { canvas } of sprites) {
          totalWidth += canvas.width;
          maxHeight = Math.max(maxHeight, canvas.height);
        }

        // Создаем результирующий canvas
        const resultCanvas = document.createElement("canvas");
        resultCanvas.width = totalWidth;
        resultCanvas.height = maxHeight;

        const resultCtx = resultCanvas.getContext("2d")!;

        // Рисуем каждый canvas на результирующем
        let currentX = 0;

        for (const sprite of sprites) {
          // Создаем временный canvas, чтобы отрисовать туда изображение без сетки
          const canvas = sprite.canvas.cloneNode() as HTMLCanvasElement;
          sprite.draw(canvas.getContext("2d")!);

          // Вычисляем позицию по Y для центрирования по вертикали
          const y = (maxHeight - sprite.canvas.height) / 2;

          resultCtx.drawImage(canvas, currentX, y);
          currentX += sprite.canvas.width;
        }

        resolve(resultCanvas);
      });
    }
  }

  protected initHandlers() {
    const { settings } = this.parent;

    settings.addEventListener("click", this.onClick);
    settings.addEventListener("submit", this.#onSubmit);
  }

  protected asNum(input: HTMLInputElement) {
    return parseInt(input.value, 10);
  }

  readonly #onSubmit = (e: Event) => {
    e.preventDefault();
  };
}
