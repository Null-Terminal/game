import { State, type StateEvent } from "#sprite-editor/state";
import { SpriteEditor } from "#/sprite-editor";

export type Command = Pick<State, "undo" | "redo">;

export class EditorHistory {
  readonly #editor: SpriteEditor;

  #history: Command[] = [];
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

      const actions = new Map();

      for (const mut of mutations) {
        for (const node of mut.addedNodes) {
          actions.set(node, {
            type: actions.get(node)?.type === "remove" ? "move" : "add",
            node: node,
            previous: mut.previousSibling,
            next: mut.nextSibling
          });
        }

        for (const node of mut.removedNodes) {
          actions.set(node, {
            type: "remove",
            node,
            previous: mut.previousSibling,
            next: mut.nextSibling
          });
        }
      }

      if (actions.size > 0) {
        this.#pushState({
          undo() {
            mute = true;

            for (const action of actions.values()) {
              const { type, node } = action;

              if (type === "add") {
                node.parentNode?.removeChild(node);

              } else {
                grid.insertBefore(node, type === "move" ? action.previous : action.next);
              }
            }

            return true;
          },

          redo() {
            mute = true;

            for (const action of actions.values()) {
              const { node } = action;

              if (action.type === "remove") {
                node.parentNode?.removeChild(node);

              } else {
                grid.insertBefore(node, action.next);
              }
            }

            return true;
          }
        });
      }
    });

    this.#gridObserver.observe(grid, { childList: true });
  }

  readonly #pushState = (state: Command) => {
    this.#history = this.#history.slice(0, this.#historyIndex + 1);
    this.#history.push(state);
    this.#historyIndex++;
  };

  readonly #onStateChange = (e: Event) => {
    this.#pushState((e as StateEvent).detail);
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
