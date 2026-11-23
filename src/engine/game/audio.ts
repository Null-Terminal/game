import { getAudioContext } from "#/audio";

import type { Subscription } from "#/event-emitter";
import type { Game } from "#engine/game";

export class GameAudio {
  readonly #master: GainNode;
  readonly #effects: GainNode;
  readonly #music: GainNode;
  readonly #subscription: Subscription;

  constructor(game: Game) {
    const context = getAudioContext();

    this.#master = context.createGain();
    this.#effects = context.createGain();
    this.#music = context.createGain();

    this.#effects.connect(this.#master);
    this.#music.connect(this.#master);
    this.#master.connect(context.destination);

    const sync = () => {
      const { master, effects, music } = game.settings.get("audio");
      this.#master.gain.value = master;
      this.#effects.gain.value = effects;
      this.#music.gain.value = music;
    };

    this.#subscription = game.settings.events.change.on((key) => {
      if (key === "audio") {
        sync();
      }
    });

    sync();
  }

  output(category: "effects" | "music" = "effects"): AudioNode {
    return category === "music" ? this.#music : this.#effects;
  }

  destroy() {
    this.#subscription.dispose();
    this.#effects.disconnect();
    this.#music.disconnect();
    this.#master.disconnect();
  }
}
