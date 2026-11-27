import { EventEmitter, handler, type Subscription } from "#lib/event-emitter";
import { Destroyable } from "#lib/destroyable";

import { GamepadInput } from "#engine/input/gamepad";
import { KeyboardInput } from "#engine/input/keyboard";
import { TouchInput } from "#engine/input/touch";

import type { GamepadBinding, InputBindings, InputOptions } from "#engine/input/types";

export class Input<Action extends string> extends Destroyable {
  readonly actions: readonly Action[];
  readonly options: Required<InputOptions>;

  readonly keyboard: KeyboardInput;
  readonly gamepad: GamepadInput;
  touch: TouchInput | null = null;

  readonly emitter = new EventEmitter({
    press: handler<Action>()
  });

  readonly events = this.emitter.events;

  get held(): ReadonlySet<Action> {
    return this.#held;
  }

  get active(): boolean {
    return this.#focused && this.options.active();
  }

  #focused = true;
  #bindings: InputBindings<Action>;

  readonly #held = new Set<Action>();
  readonly #pendingPresses = new Set<Action>();
  readonly #sources = new Map<string | GamepadBinding, Action>();

  #touchSubscription: Subscription | null = null;

  constructor(actions: readonly Action[], bindings: InputBindings<Action>, opts: InputOptions = {}) {
    super();

    this.actions = [...actions];
    this.#bindings = this.#copyBindings(bindings);
    this.options = { active: opts.active ?? (() => true) };

    this.keyboard = new KeyboardInput(this.#bindings.keyboard.keys());
    this.gamepad = new GamepadInput(this.#bindings.gamepad.keys());

    this.onDestroy(() => {
      this.keyboard.destroy();
      this.gamepad.destroy();
      this.detachTouch();
      this.clear();
      this.emitter.off();
    });

    this.onDestroy(this.keyboard.events.change.on(({ key, pressed, event }) => {
      if (this.active) {
        event.preventDefault();
      }

      this.#applyKey(`keyboard:${key}`, this.#bindings.keyboard.get(key), pressed);
    }));

    this.onDestroy(this.gamepad.events.change.on(({ key, pressed }) => {
      this.#applyKey(key, this.#bindings.gamepad.get(key), pressed);
    }));

    const listenerOptions = { signal: this.abortSignal };

    window.addEventListener("blur", () => {
      this.#focused = false;
      this.clear();
    }, listenerOptions);

    window.addEventListener("focus", () => {
      this.#focused = true;
      this.gamepad.blockHeld();
    }, listenerOptions);

  }

  setBindings(bindings: InputBindings<Action>) {
    this.clear();
    this.#bindings = this.#copyBindings(bindings);
    this.keyboard.setKeys(this.#bindings.keyboard.keys());
    this.gamepad.setKeys(this.#bindings.gamepad.keys());
  }

  press(source: string | GamepadBinding, action: Action) {
    this.#setSource(source, action);
  }

  release(source: string | GamepadBinding) {
    this.#setSource(source, null);
  }

  consumePress(action: Action): boolean {
    if (!this.#pendingPresses.has(action)) {
      return false;
    }

    this.#pendingPresses.delete(action);
    return true;
  }

  clearPresses() {
    this.#pendingPresses.clear();
  }

  attachTouch(root: ShadowRoot | HTMLElement, bindings: ReadonlyMap<string, Action>) {
    this.detachTouch();

    const mapping = new Map(bindings);
    const touch = new TouchInput(root, mapping.keys());

    this.touch = touch;
    this.#touchSubscription = touch.events.change.on(({ key, pointerId, pressed }) => {
      this.#applyKey(`touch:${pointerId}`, mapping.get(key), pressed);
    });
  }

  detachTouch() {
    this.touch?.destroy();
    this.#touchSubscription?.dispose();
    this.touch = null;
    this.#touchSubscription = null;
  }

  clear() {
    this.keyboard.clear();
    this.gamepad.clear();
    this.touch?.clear();
    this.#sources.clear();
    this.#held.clear();
    this.clearPresses();
  }

  #applyKey(source: string | GamepadBinding, action: Action | undefined, pressed: boolean) {
    if (pressed) {
      if (this.active && action != null) {
        this.press(source, action);
      }

    } else {
      this.release(source);
    }
  }

  #setSource(source: string | GamepadBinding, action: Action | null) {
    const previous = this.#sources.get(source);

    if (previous === action || (previous == null && action == null)) {
      return;
    }

    if (action == null) {
      this.#sources.delete(source);

    } else {
      this.#sources.set(source, action);
    }

    if (previous != null && !this.#sources.values().some((current) => current === previous)) {
      this.#held.delete(previous);
    }

    if (action != null && !this.#held.has(action)) {
      this.#held.add(action);
      this.#pendingPresses.add(action);
      this.events.press.emit(action);
    }
  }

  #copyBindings(bindings: InputBindings<Action>): InputBindings<Action> {
    return {
      keyboard: new Map(bindings.keyboard),
      gamepad: structuredClone(new Map(bindings.gamepad))
    };
  }
}
