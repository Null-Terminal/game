import { EventEmitter, handler } from "#lib/event-emitter";
import { Destroyable } from "#lib/destroyable";

import type { KeyboardChange } from "#engine/input/types";

export class KeyboardInput extends Destroyable {
  readonly emitter = new EventEmitter({
    change: handler<KeyboardChange>()
  });

  readonly events = this.emitter.events;

  readonly #pressed = new Set<string>();

  #keys: ReadonlySet<string>;

  constructor(keys: Iterable<string>) {
    super();
    this.#keys = new Set(keys);

    const listenerOptions = { signal: this.abortSignal };

    window.addEventListener("keydown", (event) => this.#onKeyDown(event), listenerOptions);
    window.addEventListener("keyup", (event) => this.#onKeyUp(event), listenerOptions);

    this.onDestroy(() => {
      this.clear();
      this.emitter.off();
    });
  }

  setKeys(keys: Iterable<string>) {
    this.clear();
    this.#keys = new Set(keys);
  }

  clear() {
    this.#pressed.clear();
  }

  #onKeyDown(event: KeyboardEvent) {
    const key = event.code;

    if (!this.#keys.has(key)) {
      return;
    }

    this.#pressed.add(key);
    this.events.change.emit({ key, pressed: true, event });
  }

  #onKeyUp(event: KeyboardEvent) {
    const key = event.code;

    if (this.#pressed.delete(key)) {
      this.events.change.emit({ key, pressed: false, event });
    }
  }
}
