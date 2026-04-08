import { State, type StateEvent } from "#sprite-editor/state";
import { SpriteEditor } from "#/sprite-editor";

export class EditorHistory {
  readonly #editor: SpriteEditor;

  #history: Pick<State, "undo" | "redo">[] = [];
  #historyIndex = -1;

  #gridObserver: MutationObserver | null = null;

  constructor(editor: SpriteEditor) {
    this.#editor = editor;
    this.#initHandlers();
  }

  destroy(): void {
    this.#editor.removeEventListener("stateChange", this.#onStateChange);
    document.removeEventListener("keydown", this.#onKeyboardUndoRedo);
    this.#gridObserver?.disconnect();
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
    this.#initGridObserver();
    this.#editor.addEventListener("stateChange", this.#onStateChange);
    document.addEventListener("keydown", this.#onKeyboardUndoRedo);
  }

  #initGridObserver() {
    const { grid } = this.#editor;

    let mute = false;

    this.#gridObserver = new MutationObserver((mutations) => {
      if (mute) {
        mute = false;
        return;
      }

      const actions = mutations.flatMap((mut) => {
        const added = Array.from(mut.addedNodes ?? []).map((node) => ({
          type: "add",
          node: node,
          previous: mut.previousSibling,
          next: mut.nextSibling
        }));

        const removed = Array.from(mut.removedNodes ?? []).map((node) => ({
          type: "remove",
          node,
          previous: mut.previousSibling,
          next: mut.nextSibling
        }));

        return [...added, ...removed];
      });

      if (actions.length > 0) {
        this.#history.push({
          undo() {
            mute = true;

            actions.forEach((action) => {
              const { node } = action;

              if (action.type === "add") {
                node.parentNode?.removeChild(node);

              } else {
                grid.insertBefore(node, action.next);
              }
            });

            return true;
          },

          redo() {
            mute = true;

            actions.forEach((action) => {
              const { node } = action;

              if (action.type === "add") {
                grid.insertBefore(node, action.next);

              } else {
                node.parentNode?.removeChild(node);
              }
            });

            return true;
          }
        });

        this.#historyIndex++;
      }
    });

    this.#gridObserver.observe(grid, { childList: true });
  }

  readonly #onStateChange = (e: Event) => {
    this.#history = this.#history.slice(0, this.#historyIndex + 1);
    this.#history.push((e as StateEvent).detail);
    this.#historyIndex++;
  };

  readonly #onKeyboardUndoRedo = (e: KeyboardEvent) => {
    const isCtrlPressed = e.ctrlKey || e.metaKey;

    if (isCtrlPressed && e.code === "KeyZ") {
      e.preventDefault();

      if (e.shiftKey) {
        this.redo();

      } else {
        this.undo();
      }
    }
  };
}
