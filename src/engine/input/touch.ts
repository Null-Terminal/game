import { EventEmitter, handler } from "#lib/event-emitter";
import { Destroyable } from "#lib/destroyable";

import type { TouchChange } from "#engine/input/types";

export class TouchInput extends Destroyable {
  readonly emitter = new EventEmitter({
    change: handler<TouchChange>()
  });

  readonly events = this.emitter.events;

  readonly #pointers = new Map<number, string>();

  constructor(root: ShadowRoot | HTMLElement, keys: Iterable<string>) {
    super();
    const listenerOptions = { signal: this.abortSignal };

    for (const key of keys) {
      for (const control of root.querySelectorAll<HTMLElement>(key)) {
        control.addEventListener("pointerdown", (event) => this.#onPointerDown(event, key, control), listenerOptions);
        control.addEventListener("pointerup", (event) => this.#release(event.pointerId), listenerOptions);
        control.addEventListener("pointercancel", (event) => this.#release(event.pointerId), listenerOptions);
        control.addEventListener("lostpointercapture", (event) => this.#release(event.pointerId), listenerOptions);
      }
    }

    this.onDestroy(() => {
      this.clear();
      this.emitter.off();
    });
  }

  clear() {
    for (const pointerId of this.#pointers.keys()) {
      this.#release(pointerId);
    }
  }

  #onPointerDown(event: PointerEvent, key: string, control: HTMLElement) {
    if (this.#pointers.has(event.pointerId)) {
      return;
    }

    event.preventDefault();
    control.setPointerCapture(event.pointerId);
    this.#pointers.set(event.pointerId, key);
    this.events.change.emit({ key, pointerId: event.pointerId, pressed: true });
  }

  #release(pointerId: number) {
    const key = this.#pointers.get(pointerId);

    if (key == null) {
      return;
    }

    this.#pointers.delete(pointerId);
    this.events.change.emit({ key, pointerId, pressed: false });
  }
}
