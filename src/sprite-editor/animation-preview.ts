import { cache } from "#decorators/cache";

import type { SpriteEditor } from "#/sprite-editor";

import styles from "#sprite-editor/animation-preview/styles.css?raw";
import template from "#sprite-editor/animation-preview/template.html?raw";

import { ActionHandlers } from "#sprite-editor/animation-preview/actions";

export class AnimationPreview extends HTMLElement {
  @cache
  get controls() {
    return this.shadowRoot!.getElementById("controls")!;
  }

  @cache
  get player(): HTMLCanvasElement {
    return this.shadowRoot!.getElementById("player") as HTMLCanvasElement;
  }

  get grid() {
    return this.#editor.grid;
  }

  speed = 1;

  #editor!: SpriteEditor;
  #actionHandlers!: ActionHandlers;

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

  #render() {
    if (this.shadowRoot == null) {
      throw new Error("ShadowRoot element not found");
    }

    this.shadowRoot.innerHTML = `<style>${styles}</style>${template}`;
    this.#actionHandlers = new ActionHandlers(this);
  }
}

customElements.define("animation-preview", AnimationPreview);
