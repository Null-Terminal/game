import { EventEmitter, handler } from "#lib/event-emitter";
import { Destroyable } from "#lib/destroyable";

import type { GamepadBinding, KeyChange } from "#engine/input/types";

export class GamepadInput extends Destroyable {
  static #selectedIndex: number | null = null;

  static getGamepad(): Gamepad | null {
    if (typeof navigator.getGamepads !== "function") {
      GamepadInput.#selectedIndex = null;
      return null;
    }

    const gamepads = navigator.getGamepads();
    const selectedIndex = GamepadInput.#selectedIndex;

    if (selectedIndex != null && gamepads[selectedIndex]?.connected) {
      return gamepads[selectedIndex]!;
    }

    for (let index = 0; index < gamepads.length; index++) {
      const gamepad = gamepads[index];

      if (gamepad?.connected) {
        GamepadInput.#selectedIndex = index;
        return gamepad;
      }
    }

    GamepadInput.#selectedIndex = null;
    return null;
  }

  static isButtonPressed(gamepad: Gamepad | null, index: number): boolean {
    const button = gamepad?.buttons[index];
    return button?.pressed === true || (button?.value ?? 0) >= 0.5;
  }

  readonly emitter = new EventEmitter({
    change: handler<KeyChange<GamepadBinding>>()
  });

  readonly events = this.emitter.events;

  // Уже обработанные нажатия
  readonly #pressed = new Set<GamepadBinding>();

  // Нажатия, игнорируемые до отпускания
  readonly #blocked = new Set<GamepadBinding>();

  #keys: readonly GamepadBinding[];
  #tickId: number;

  constructor(keys: Iterable<GamepadBinding>) {
    super();
    this.#keys = [...keys];
    this.#tickId = requestAnimationFrame(() => this.#tick());

    this.onDestroy(() => {
      cancelAnimationFrame(this.#tickId);
      this.clear();
      this.emitter.off();
    });
  }

  setKeys(keys: Iterable<GamepadBinding>) {
    this.clear();
    this.#keys = [...keys];
    this.blockHeld();
  }

  blockHeld() {
    const gamepad = GamepadInput.getGamepad();
    this.#blocked.clear();

    for (const key of this.#keys) {
      if (this.#isBindingPressed(gamepad, key)) {
        this.#blocked.add(key);
      }
    }
  }

  playEffect(type: GamepadHapticEffectType, params: GamepadEffectParameters) {
    const actuator = GamepadInput.getGamepad()?.vibrationActuator;

    if (actuator?.playEffect != null) {
      void actuator.playEffect(type, params).catch((error) => {
        console.warn("Gamepad vibration failed", error);
      });
    }
  }

  clear() {
    this.#pressed.clear();
  }

  #poll() {
    const gamepad = GamepadInput.getGamepad();

    for (const key of this.#keys) {
      const physicallyPressed = this.#isBindingPressed(gamepad, key);

      if (!physicallyPressed) {
        this.#blocked.delete(key);
      }

      const pressed = physicallyPressed && !this.#blocked.has(key);

      if (pressed === this.#pressed.has(key)) {
        continue;
      }

      if (pressed) {
        this.#pressed.add(key);

      } else {
        this.#pressed.delete(key);
      }

      this.events.change.emit({ key, pressed });
    }
  }

  #isBindingPressed(gamepad: Gamepad | null, binding: GamepadBinding): boolean {
    if ("button" in binding) {
      return GamepadInput.isButtonPressed(gamepad, binding.button);
    }

    const value = gamepad?.axes[binding.axis] ?? 0;
    return value * binding.direction >= (binding.threshold ?? 0.25);
  }

  #tick() {
    this.#poll();
    this.#tickId = requestAnimationFrame(() => this.#tick());
  }
}
