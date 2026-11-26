import { DomActionHandlers } from "#lib/dom-action-handlers";

import type { GameMenu } from "#game/menu";

export class MenuActions extends DomActionHandlers<GameMenu> {
  constructor(menu: GameMenu) {
    super(menu);
  }

  playGame() {
    void this.parent.playGame();
  }

  openSettings() {
    this.parent.openSettings();
  }

  closeSettings() {
    this.parent.closeSettings();
  }

  protected initHandlers() {
    this.parent.shadowRoot!.addEventListener("click", this.onAction, { signal: this.abortSignal });
  }
}
