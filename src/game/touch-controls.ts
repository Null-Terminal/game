import styles from "#game/touch-controls/styles.css?raw";
import template from "#game/touch-controls/template.html?raw";

import type { GameInput, GameAction } from "#game/input";

import type { Subscription } from "#lib/event-emitter";
import type { Game } from "#engine/game";
import type { ProjectSettings } from "#game/settings";

const touchBindings = new Map<string, GameAction>([
  ['[data-action="left"]', "left"],
  ['[data-action="right"]', "right"],
  ['[data-action="use"]', "use"],
  ['[data-action="jetpack"]', "jetpack"],
  ['[data-action="jump"]', "jump"],
  ["#pause", "pause"]
]);

export class GameTouchControls extends HTMLElement {
  #game: Game<ProjectSettings> | null = null;
  #input: GameInput | null = null;
  #pauseSubscription: Subscription | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.shadowRoot!.innerHTML = `<style>${styles}</style>${template}`;
  }

  disconnectedCallback() {
    this.#input?.detachTouch();
    this.#pauseSubscription?.dispose();
    this.#pauseSubscription = null;
  }

  mount(game: Game<ProjectSettings>, input: GameInput) {
    this.#game = game;
    this.#input = input;
    this.#input.attachTouch(this.shadowRoot!, touchBindings);
    this.#pauseSubscription = game.canvas.events.pauseChange.on(() => this.#sync());
    this.#sync();
  }

  #sync() {
    const game = this.#game;
    this.hidden = game == null || !game.status.playing || !game.hasWorld;

    if (this.hidden) {
      this.#input?.touch?.clear();
    }
  }
}

customElements.define("game-touch-controls", GameTouchControls);
