import type { SpriteDescriptor } from "#/sprite-buffer";

import type { Sprite } from "#sprite-editor/sprite";

export class SpriteHistory {
  readonly #sprite: Sprite;

  #history: SpriteDescriptor[] = [];

  #historyIndex = -1;

  constructor(sprite: Sprite) {
    this.#sprite = sprite;
  }

  saveState() {
    const sprite = this.#sprite;

    this.#history.push({
      x: sprite.x,
      y: sprite.y,
      width: sprite.width,
      height: sprite.height,
      spriteId: sprite.spriteId,
      animationDelay: sprite.animationDelay,
    });

    sprite.dispatchEvent(new CustomEvent("stateChange", {
      bubbles: true,
      composed: true
    }));
  }

  undo(): boolean {
    if (!this.canUndo) {
      return false;
    }

    this.#historyIndex--;
    this.#restoreFromState(this.#history[this.#historyIndex]);

    return true;
  }

  redo(): boolean {
    if (!this.canRedo) {
      return false;
    }

    this.#historyIndex++;
    this.#restoreFromState(this.#history[this.#historyIndex]);

    return true;
  }

  canUndo() {
    return this.#historyIndex > 0;
  }

  canRedo() {
    return this.#historyIndex < this.#history.length - 1;
  }

  clearHistory() {
    this.#history = [];
    this.#historyIndex = -1;
  }

  #restoreFromState(state: SpriteDescriptor | undefined) {
    if (state == null) {
      return;
    }

    const sprite = this.#sprite;

    sprite.x = state.x;
    sprite.y = state.y;
    sprite.width = state.width;
    sprite.height = state.height;
    sprite.spriteId = state.spriteId;
    sprite.animationDelay = state.animationDelay;

    this.saveState();
  }
}
