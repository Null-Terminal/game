import { loadBuffer } from "#/file-loader";

import { RenderedSpriteBuffer } from "#/sprite-buffer";
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

  clearGrid() {
    this.parent.grid.innerHTML = "";
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

    const sprites = await groupSprites();

    for (const sprite of sprites.values()) {
      if (sprite.image == null) {
        continue;
      }

      if (sprite.data == null) {
        for (let i = 0; i < length; i++) {
          editor.grid?.append(new Sprite(sprite.image, { width, height }));
        }

      } else {
        const data = new RenderedSpriteBuffer(sprite.data);

        for (let i = 0; i < data.size; i++) {
          const spriteBuffer = data.at(i)!;

          editor.grid?.append(new Sprite(sprite.image, {
            x: spriteBuffer.x,
            y: spriteBuffer.y,

            width: spriteBuffer.width,
            height: spriteBuffer.height,

            spriteId: spriteBuffer.spriteId,
            animationDelay: spriteBuffer.animationDelay,
          }));
        }
      }
    }

    async function groupSprites() {
      const sprites = new Map<string, {image?: File, data?: Uint8Array}>;

      const fileExt =  /\.[^.]*$/;

      for (const file of sprite.files!) {
        const fileName = file.name;
        const ext = fileName.match(fileExt)?.[0];

        const groupKey = fileName.replace(fileExt, "");
        const group = sprites.get(groupKey) ?? {};

        if (ext === ".buffer") {
          group.data = await loadBuffer(file);

        } else {
          group.image = file;
        }

        sprites.set(groupKey, group);
      }

      return sprites;
    }
  }

  async playPreview() {
    const { player } = this.parent;

    const { canvas, data } = this.#mergeSprites();

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

  renderGrid() {
    const editor = this.parent;

    if (!editor.settings.checkValidity()) {
      return;
    }

    const { canvas, data } = this.#mergeSprites();

    const image = document.createElement("a");

    image.download = editor.getSetting("name").value;
    image.href = canvas.toDataURL(`image/${editor.getSetting("ext").value}`);
    image.click();

    const buffer = document.createElement("a");

    buffer.download = `${image.download}.buffer`;
    buffer.href = data.toDataURL();
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

  #mergeSprites() {
    return RenderedSpriteBuffer.mergeSprites(
      Array.from(this.parent.grid.querySelectorAll("sprite-item")) as Sprite[]
    );
  }
}
