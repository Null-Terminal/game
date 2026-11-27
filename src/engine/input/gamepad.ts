import { EventEmitter, handler } from "#lib/event-emitter";
import { Destroyable } from "#lib/destroyable";

import type { GamepadBinding, GamepadDevice, KeyChange } from "#engine/input/types";

export class GamepadInput extends Destroyable {
  static #selectedIndex: number | null = null;
  static #preferredId = "";

  static get selectedIndex(): number | null {
    this.getGamepad();
    return this.#selectedIndex;
  }

  static getConnectedGamepads(): GamepadDevice[] {
    if (typeof navigator.getGamepads !== "function") {
      return [];
    }

    return navigator.getGamepads().entries()
      .filter((entry): entry is [number, Gamepad] => entry[1]?.connected === true)
      .map(([index, gamepad]) => ({ index, id: gamepad.id }))
      .toArray();
  }

  static selectGamepad(index: number): string | null {
    const gamepad = Number.isInteger(index) ? navigator.getGamepads?.()[index] : null;

    if (gamepad?.connected !== true) {
      return null;
    }

    this.#selectedIndex = index;
    this.#preferredId = gamepad.id;

    return gamepad.id;
  }

  static setPreferredId(id: string) {
    this.#preferredId = id;
    this.getGamepad();
  }

  static getGamepad(): Gamepad | null {
    if (typeof navigator.getGamepads !== "function") {
      GamepadInput.#selectedIndex = null;
      return null;
    }

    const gamepads = navigator.getGamepads();

    const preferredId = GamepadInput.#preferredId;
    const selectedIndex = GamepadInput.#selectedIndex;

    if (
      preferredId &&
      selectedIndex != null &&
      gamepads[selectedIndex]?.connected &&
      gamepads[selectedIndex]?.id === preferredId
    ) {
      return gamepads[selectedIndex]!;
    }

    if (preferredId) {
      for (let index = 0; index < gamepads.length; index++) {
        const gamepad = gamepads[index];

        if (gamepad?.connected && gamepad.id === preferredId) {
          GamepadInput.#selectedIndex = index;
          return gamepad;
        }
      }
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

  #currentId = GamepadInput.getGamepad()?.id ?? null;
  #currentIndex = GamepadInput.selectedIndex;

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

    const id = gamepad?.id ?? null;
    const selectedIndex = GamepadInput.#selectedIndex;

    if (selectedIndex !== this.#currentIndex || id !== this.#currentId) {
      for (const key of this.#pressed) {
        this.events.change.emit({ key, pressed: false });
      }

      this.#pressed.clear();
      this.#blocked.clear();

      this.#currentId = id;
      this.#currentIndex = selectedIndex;
    }

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
