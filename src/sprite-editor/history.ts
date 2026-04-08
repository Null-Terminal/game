import { State, type StateEvent } from "#sprite-editor/state";
import { SpriteEditor } from "#/sprite-editor";

export class EditorHistory {
  readonly #editor: SpriteEditor;

  #history: State[] = [];

  #historyIndex = -1;

  constructor(editor: SpriteEditor) {
    this.#editor = editor;
    this.#initHandlers();
  }

  destroy(): void {
    this.#editor.removeEventListener("stateChange", this.#onStateChange);
    document.removeEventListener("keydown", this.#onKeyboardUndoRedo);
  }

  undo(): boolean {
    if (!this.canUndo()) {
      return false;
    }

    this.#history[this.#historyIndex]?.undo();
    this.#historyIndex--;

    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) {
      return false;
    }

    this.#historyIndex++;
    this.#history[this.#historyIndex]?.redo();

    return true;
  }

  canUndo() {
    return this.#historyIndex >= 0;
  }

  canRedo() {
    return this.#historyIndex < this.#history.length - 1;
  }

  clearHistory() {
    this.#history = [];
    this.#historyIndex = -1;
  }

  #initHandlers() {
    this.#editor.addEventListener("stateChange", this.#onStateChange);
    document.addEventListener("keydown", this.#onKeyboardUndoRedo);
  }

  readonly #onStateChange = (e: Event) => {
    this.#history = this.#history.slice(0, this.#historyIndex + 1);
    this.#history.push((e as StateEvent).detail);
    this.#historyIndex++;
  };

  readonly #onKeyboardUndoRedo = (e: KeyboardEvent) => {
    const isCtrlPressed = e.ctrlKey || e.metaKey;

    if (isCtrlPressed && e.key.toLowerCase() === "z") {
      e.preventDefault();

      if (e.shiftKey) {
        this.redo();

      } else {
        this.undo();
      }
    }
  };
}
