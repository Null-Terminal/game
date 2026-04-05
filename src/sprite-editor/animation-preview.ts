import { cache } from "#decorators/cache";
import { RenderedSpriteBuffer } from "#sprite-buffer/rendered-sprite-buffer";

import styles from "#sprite-editor/animation-preview/styles.css?raw";
import template from "#sprite-editor/animation-preview/template.html?raw";

import type { SpriteEditor } from "#/sprite-editor";
import type { Sprite } from "#sprite-editor/sprite";

import { ActionHandlers } from "#sprite-editor/animation-preview/actions";

export class AnimationPreview extends HTMLElement {
  @cache
  get controls() {
    return this.shadowRoot!.getElementById("controls")!;
  }

  speed = 1;
  spriteIndex = 0;
  backgroundColor = "#FFF";

  @cache
  get #ctx() {
    return this.#player.getContext("2d")!;
  }

  @cache
  get #player(): HTMLCanvasElement {
    return this.shadowRoot!.getElementById("player") as HTMLCanvasElement;
  }

  #editor!: SpriteEditor;
  #actionHandlers!: ActionHandlers;
  #animationId = 0;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    let parent = this.parentNode;

    while (parent != null) {
      if (parent instanceof ShadowRoot) {
        this.#editor = parent.host as SpriteEditor;
        break;
      }

      parent = parent.parentNode;
    }

    if (this.#editor == null) {
      throw new Error("Editor is not available");
    }

    this.#render();
  }

  disconnectedCallback() {
    this.#actionHandlers.destroy();
  }

  play() {
    const { canvas, data } = this.#renderSprite();

    this.#player.height = canvas.height;

    let lastFrameTime = 0;

    cancelAnimationFrame(this.#animationId);

    const animate = (now?: number) => {
      this.#animationId = requestAnimationFrame(animate);

      if (now == null) {
        return;
      }

      this.spriteIndex %= data.size;
      const sprite = data.at(this.spriteIndex)!;

      if (now - lastFrameTime >= sprite.animationDelay * this.speed) {
        this.#editor.grid
          .querySelector<HTMLElement>(`sprite-item:nth-child(${this.spriteIndex + 1})`)
          ?.focus({ preventScroll: true });

        this.spriteIndex++;
        this.spriteIndex %= data.size;

        this.#player.width = sprite.width;
        this.clear();

        this.#ctx.drawImage(
          canvas,
          sprite.x,
          sprite.y,
          sprite.width,
          sprite.height,
          0,
          canvas.height - sprite.height,
          sprite.width,
          sprite.height
        );

        lastFrameTime = now;
      }
    };

    animate();
  }

  renderSprite(spriteIndex: number) {
    this.pause();
    this.clear();

    const { canvas, data } = this.#renderSprite();

    spriteIndex %= data.size;
    const sprite = data.at(spriteIndex);

    if (sprite != null) {
      this.#editor.grid
        .querySelector<HTMLElement>(`sprite-item:nth-child(${spriteIndex + 1})`)
        ?.focus({ preventScroll: true });

      this.#ctx.drawImage(
        canvas,
        sprite.x,
        sprite.y,
        sprite.width,
        sprite.height,
        0,
        canvas.height - sprite.height,
        sprite.width,
        sprite.height
      );
    }
  }

  pause() {
    cancelAnimationFrame(this.#animationId);
  }

  stop() {
    cancelAnimationFrame(this.#animationId);
    this.spriteIndex = 0;
    this.clear();
  }

  resize(width: number, height: number) {
    this.#player.width = width;
    this.#player.height = height;
  }

  clear() {
    this.#ctx.fillStyle = this.backgroundColor;
    this.#ctx.fillRect(0, 0, this.#player.width, this.#player.height);
  }

  #renderSprite() {
    return RenderedSpriteBuffer.mergeSprites(
      Array.from(this.#editor.grid.querySelectorAll("sprite-item")) as Sprite[]
    );
  }

  #render() {
    if (this.shadowRoot == null) {
      throw new Error("ShadowRoot element not found");
    }

    this.shadowRoot.innerHTML = `<style>${styles}</style>${template}`;
    this.#actionHandlers = new ActionHandlers(this);
  }
}

customElements.define("animation-preview", AnimationPreview);
