import { loadBuffer } from "#/file-loader";
import { SpriteBuffer } from "#/sprite-buffer";

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

  async addToGrid() {
    const editor = this.parent;

    if (!editor.settings.checkValidity()) {
      return;
    }

    const sprite = editor.getSetting("sprite");
    const length = this.asNum(editor.getSetting("length"));

    const width = this.asNum(editor.getSetting("width"));
    const height = this.asNum(editor.getSetting("height"));

    const sprites = new Map<string, {image?: File, data?: Uint8Array}>;

    const fileExt =  /\.[^.]*$/;

    for (const file of sprite.files!) {
      const fileName = file.name;

      const key = fileName.replace(fileExt, "");

      const desc = sprites.get(key) ?? {};

      const ext = fileName.match(fileExt)?.[0];

      if (ext === ".buffer") {
        desc.data = await loadBuffer(file);

      } else {
        desc.image = file;
      }

      sprites.set(key, desc);
    }

    for (const sprite of sprites.values()) {
      if (sprite.image == null) {
        continue;
      }

      if (sprite.data == null) {
        for (let i = 0; i < length; i++) {
          editor.grid?.append(new Sprite(sprite.image, { width, height }));
        }

      } else {
        const length = sprite.data[0]!;

        let offset = 2;

        for (let i = 0; i < length; i++) {
          const spriteBuffer = new SpriteBuffer(sprite.data, offset);

          console.log(spriteBuffer.x, spriteBuffer.y, spriteBuffer.width, spriteBuffer.height);
          console.log(spriteBuffer.delay, spriteBuffer.id);

          offset += spriteBuffer.BYTES_PER_ELEMENT;

          editor.grid?.append(new Sprite(sprite.image, {
            x: spriteBuffer.x,
            y: spriteBuffer.y,

            width: spriteBuffer.width,
            height: spriteBuffer.height,

            spriteId: spriteBuffer.id,
            animationDelay: spriteBuffer.delay,
          }));
        }
      }
    }
  }

  clearGrid() {
    this.parent.grid.innerHTML = "";
  }

  async playPreview() {
    const { player } = this.parent;

    const { canvas, data } = this.mergeSprites();

    player.width = canvas.width;
    player.height = canvas.height;

    const ctx = player.getContext("2d")!;

    while (true) {
      for (let i = 2; i < data.length; i += 16) {
        const nums = new Uint16Array(data.buffer, i, 5);

        ctx.drawImage(canvas, nums[0], nums[1], nums[2], nums[3], 0, 0, nums[2], nums[3]);

        await new Promise(resolve => setTimeout(resolve, nums[4]));
      }
    }
  }

  mergeSprites() {
    const sprites = Array.from(this.parent.grid.querySelectorAll("sprite-item")) as Sprite[];

    // Вычисляем общую ширину и максимальную высоту
    let totalWidth = 0;
    let maxHeight = 0;

    for (const { canvas } of sprites) {
      totalWidth += canvas.width;
      maxHeight = Math.max(maxHeight, canvas.height);
    }

    // Создаем результирующий canvas
    const canvas = document.createElement("canvas");
    canvas.width = totalWidth;
    canvas.height = maxHeight;

    const ctx = canvas.getContext("2d")!;

    // Рисуем каждый canvas на результирующем
    let currentX = 0;

    const HEADER = 2;
    const data = new Uint8Array(sprites.length * SpriteBuffer.BYTES_PER_ELEMENT + HEADER);

    data[0] = sprites.length;
    data[1] = 0xFF;

    let offset = HEADER;

    for (const sprite of sprites) {
      // Создаем временный canvas, чтобы отрисовать туда изображение без сетки
      const image = sprite.canvas.cloneNode() as HTMLCanvasElement;
      sprite.draw(image.getContext("2d")!);

      // Вычисляем позицию по Y для центрирования по вертикали
      const y = (maxHeight - sprite.canvas.height) / 2;
      ctx.drawImage(image, currentX, y);

      const spriteBuffer = new SpriteBuffer(data, offset);
      offset += spriteBuffer.BYTES_PER_ELEMENT;

      spriteBuffer.x = -currentX;
      spriteBuffer.y = -y;
      spriteBuffer.width = image.width;
      spriteBuffer.height = image.height;
      spriteBuffer.delay = sprite.animationDelay;
      spriteBuffer.id = sprite.spriteId;

      console.log(spriteBuffer.x, spriteBuffer.y, spriteBuffer.width, spriteBuffer.height);
      console.log(spriteBuffer.delay, spriteBuffer.id);

      currentX += sprite.canvas.width;
    }

    return { canvas, ctx, data };
  }

  renderGrid() {
    const editor = this.parent;

    if (!editor.settings.checkValidity()) {
      return;
    }

    const { canvas, data } = this.mergeSprites();

    const image = document.createElement("a");

    image.download = editor.getSetting("name").value;
    image.href = canvas.toDataURL(`image/${editor.getSetting("ext").value}`);
    image.click();

    const buffer = document.createElement("a");

    buffer.download = `${image.download}.buffer`;
    buffer.href = `data:application/octet-stream;base64,${data.toBase64()}`;
    buffer.click();
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
