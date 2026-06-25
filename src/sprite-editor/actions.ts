import { loadText } from "#/file-loader";
import type { SpriteEditor } from "#/sprite-editor";

import { Sprite } from "#sprite-editor/sprite";
import { SpriteAnimation } from "#sprite-editor/sprite-animation";

import { Handlers } from "#sprite-editor/handlers";

export class ActionHandlers extends Handlers<SpriteEditor> {
  constructor(parent: SpriteEditor) {
    super(parent);
  }

  destroy() {
    const { settings } = this.parent;

    settings.removeEventListener("click", this.onAction);
    settings.removeEventListener("submit", this.#onSubmit);
  }

  reset() {
    const editor = this.parent;
    editor.grid.innerHTML = "";

    queueMicrotask(() => {
      editor.history.clear();
    });
  }

  async addToGrid() {
    const editor = this.parent;

    if (!editor.settings.checkValidity()) {
      return;
    }

    const sprite = editor.getSetting("sprite");
    const length = editor.getSetting("length").valueAsNumber;

    const width = editor.getSetting("width").valueAsNumber;
    const height = editor.getSetting("height").valueAsNumber;

    const sprites = await groupSprites();

    for (const sprite of sprites.values()) {
      if (sprite.image == null) {
        continue;
      }

      if (sprite.animation == null) {
        for (let i = 0; i < length; i++) {
          editor.grid?.append(new Sprite(sprite.image, { width, height }));
        }

      } else {
        const animation = SpriteAnimation.fromJSON(sprite.animation);

        editor.speed = animation.params.speed;
        editor.scale = animation.params.scale;

        for (const spriteDescriptor of animation) {
          editor.grid?.append(new Sprite(sprite.image, {
            ...spriteDescriptor,
            x: -spriteDescriptor.x,
            y: -spriteDescriptor.y,
          }));
        }
      }
    }

    async function groupSprites() {
      const sprites = new Map<string, {image?: File, animation?: string}>;

      const fileExt =  /\.[^.]*$/;
      const fileSuffix =  /\..*/;

      for (const file of sprite.files!) {
        const fileName = file.name;
        const ext = fileName.match(fileExt)?.[0];

        const groupKey = fileName.replace(fileSuffix, "");
        const group = sprites.get(groupKey) ?? {};

        if (ext === ".json") {
          group.animation = await loadText(file);

        } else {
          group.image = file;
        }

        sprites.set(groupKey, group);
      }

      return sprites;
    }
  }

  renderGrid() {
    const editor = this.parent;

    if (!editor.settings.checkValidity()) {
      return;
    }

    const { canvas, animation } = SpriteAnimation.mergeSprites(
      Array.from(this.parent.grid.querySelectorAll("sprite-item")) as Sprite[],

      {
        speed: editor.speed,
        scale: editor.scale,
      }
    );

    const image = document.createElement("a");

    image.download = editor.getSetting("name").value;
    image.href = canvas.toDataURL(`image/${editor.getSetting("ext").value}`);
    image.click();

    const buffer = document.createElement("a");

    buffer.download = `${image.download}.animation.json`;
    buffer.href = animation.toDataURL();
    buffer.click();
  }

  trimSizes() {
    const editor = this.parent;

    if (!editor.settings.checkValidity()) {
      return;
    }

    const sprites = Array.from(this.parent.grid.querySelectorAll("sprite-item")) as Sprite[];

    for (const sprite of sprites) {
      sprite.trimSize();
      sprite.history.save();
    }

    editor.history.pushState({
      undo() {
        for (const sprite of sprites) {
          sprite.history.undo();
        }
      },

      redo() {
        for (const sprite of sprites) {
          sprite.history.redo();
        }
      }
    });
  }

  protected initHandlers() {
    const { settings } = this.parent;

    settings.addEventListener("click", this.onAction);
    settings.addEventListener("submit", this.#onSubmit);
  }

  readonly #onSubmit = (e: Event) => {
    e.preventDefault();
  };
}
