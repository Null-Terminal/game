export type StateEvent = CustomEvent<State>;

export abstract class State<Parent extends HTMLElement = HTMLElement, State = unknown> {
  protected readonly parent: Parent;

  protected history: State[] = [];

  protected historyIndex = -1;

  protected constructor(parent: Parent) {
    this.parent = parent;
  }

  abstract save(dispatchEvent?: boolean): void;

  clear() {
    this.history = [];
    this.historyIndex = -1;
  }

  undo() {
    if (this.canUndo()) {
      this.historyIndex--;
      this.restoreFromState(this.history[this.historyIndex]);
    }
  }

  redo() {
    if (this.canRedo()) {
      this.historyIndex++;
      this.restoreFromState(this.history[this.historyIndex]);
    }
  }

  canUndo() {
    return this.historyIndex > 0;
  }

  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  protected pushState(state: State, dispatchEvent = true): void {
    this.history = this.history.slice(0, this.historyIndex + 1);

    // Состояния в истории не должны быть подряд одинаковыми
    if (JSON.stringify(state) !== JSON.stringify(this.history.at(-1))) {
      this.history.push(state);
      this.historyIndex++;

      if (dispatchEvent) {
        this.parent.dispatchEvent(new CustomEvent("stateChange", {
          bubbles: true,
          composed: true,
          detail: this
        }));
      }
    }
  }

  protected abstract restoreFromState(state: State | undefined): void;
}
