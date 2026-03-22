import styles from "#sprite-editor/styles.css?raw";
import template from "#sprite-editor/template.html?raw";

class SpriteEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.#render();
  }

  #render() {
    if (this.shadowRoot != null) {
      this.shadowRoot.innerHTML = `<style>${styles}</style>${template}`;
    }
  }
}

customElements.define("sprite-editor", SpriteEditor);
