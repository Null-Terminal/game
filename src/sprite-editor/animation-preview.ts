import { cache } from "#decorators/cache";
import { SpriteAnimation } from "#/sprite-animation";

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

  #backgroundColor: string | null = null;
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
    this.clear();

    const mergedSprite = this.#renderSprite();

    if (mergedSprite.animation.isEmpty()) {
      return;
    }

    let lastFrameTime = 0;
    let spriteIndex = this.spriteIndex;

    cancelAnimationFrame(this.#animationId);

    const animate = (now?: number) => {
      this.#animationId = requestAnimationFrame(animate);

      if (now == null) {
        return;
      }

      spriteIndex %= mergedSprite.animation.length;
      const sprite = mergedSprite.animation.at(spriteIndex)!;

      if (now - lastFrameTime >= sprite.animationDelay * this.speed) {
        this.spriteIndex = spriteIndex;
        this.renderSprite(this.spriteIndex, mergedSprite);
        spriteIndex++;
        lastFrameTime = now;
      }
    };

    animate();
  }

  renderSprite(spriteIndex: number, { canvas, animation } = this.#renderSprite()) {
    if (animation.isEmpty()) {
      return;
    }

    spriteIndex %= animation.length;
    const sprite = animation.at(spriteIndex);

    if (sprite != null) {
      this.#player.height = canvas.height;
      this.#player.width = sprite.width;

      this.#editor.focusSprite(spriteIndex, { preventScroll: true });

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

    } else {
      this.clear();
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
    if (this.#backgroundColor == null) {
      const playerBox = this.#player.parentNode;

      if (playerBox instanceof Element) {
        this.#backgroundColor = getComputedStyle(playerBox).backgroundColor;
      }

      this.#backgroundColor ??= "#333";
    }

    this.#ctx.fillStyle = this.#backgroundColor;
    this.#ctx.fillRect(0, 0, this.#player.width, this.#player.height);
  }

  #renderSprite() {
    return SpriteAnimation.mergeSprites(
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
