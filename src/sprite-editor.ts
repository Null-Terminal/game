import { cache } from "#/decorators/cache";

import styles from "#sprite-editor/styles.css?raw";
import template from "#sprite-editor/template.html?raw";

import { ActionHandlers } from "#sprite-editor/actions";

export class SpriteEditor extends HTMLElement {
  @cache
  get settings(): HTMLFormElement {
    return this.shadowRoot!.getElementById("settings") as HTMLFormElement;
  }

  @cache
  get grid(): HTMLElement {
    return this.shadowRoot!.getElementById("grid")!;
  }

  #actionHandlers!: ActionHandlers;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.#render();
  }

  disconnectedCallback() {
    this.#actionHandlers.destroy();
  }

  getSettingElement<T extends HTMLInputElement>(name: string): T {
    const elem = this.settings.elements.namedItem(name);

    if (elem == null) {
      throw new Error("Failed to find settings element");
    }

    return elem as T;
  }

  #render() {
    if (this.shadowRoot == null) {
      throw new Error("ShadowRoot element not found");
    }

    this.shadowRoot.innerHTML = `<style>${styles}</style>${template}`;
    this.#actionHandlers = new ActionHandlers(this);
  }
}

customElements.define("sprite-editor", SpriteEditor);
