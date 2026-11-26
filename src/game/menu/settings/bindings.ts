import { DomActionHandlers } from "#lib/dom-action-handlers";
import { GamepadInput, type GamepadBinding } from "#engine/input";

import { gameActions, type GameAction } from "#game/input/types";
import { defaultProjectSettings } from "#game/settings";

import type { GameSettingsPanel } from "#game/menu/settings";

type Capture =
  | { device: "keyboard"; action: GameAction }
  | { device: "gamepad"; action: GameAction; armed: boolean };

export class BindingActions extends DomActionHandlers<GameSettingsPanel> {
  #capture: Capture | null = null;

  get #settings() {
    return this.parent.game?.settings;
  }

  get #error(): HTMLElement {
    return this.parent.shadowRoot!.getElementById("controls-error")!;
  }

  constructor(panel: GameSettingsPanel) {
    super(panel);
  }

  sync() {
    const controls = this.#settings?.get("controls");

    if (controls == null) {
      return;
    }

    for (const action of gameActions) {
      const keyboardButton = this.#getKeyboardBindingButton(action);
      const addGamepadButton = this.#getGamepadAddButton(action);
      const capture = this.#capture?.action === action ? this.#capture : null;

      if (capture?.device !== "keyboard") {
        keyboardButton.textContent = controls.keyboard[action];
      }

      if (capture?.device !== "gamepad") {
        addGamepadButton.textContent = "Добавить";
      }

      this.#renderGamepadBindings(action, controls.gamepad[action]);
    }
  }

  cancelCapture() {
    this.#capture = null;
    this.sync();
  }

  captureKeyboard(event: Event) {
    const button = event.target;

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    this.#capture = { device: "keyboard", action: button.dataset["keyboardControl"] as GameAction };
    button.textContent = "Нажмите клавишу…";
    this.#error.textContent = "";
  }

  captureGamepad(event: Event) {
    const button = event.target;

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    this.#capture = { device: "gamepad", action: button.dataset["gamepadAdd"] as GameAction, armed: false };
    button.textContent = "Отпустите кнопки…";
    this.#error.textContent = "";
  }

  pollGamepadCapture(): boolean {
    const capture = this.#capture;

    if (capture?.device !== "gamepad") {
      return false;
    }

    const gamepad = GamepadInput.getGamepad();

    if (gamepad == null) {
      this.#error.textContent = "Геймпад не обнаружен.";
      capture.armed = false;
      return true;
    }

    const binding = this.#findActiveGamepadBinding(gamepad);

    if (!capture.armed) {
      if (binding == null) {
        capture.armed = true;
        this.#getGamepadAddButton(capture.action).textContent = "Нажмите кнопку…";
      }

      return true;
    }

    if (binding == null) {
      return true;
    }

    this.#capture = null;

    const settings = this.#settings!;
    const controls = settings.get("controls");

    const duplicate = gameActions.find((action) =>
      controls.gamepad[action].some((item) =>
        this.#areBindingsEqual(item, binding)));

    if (duplicate != null) {
      this.#error.textContent = "Эта кнопка или ось уже назначена.";
      this.sync();
      return true;
    }

    settings.set("controls", {
      ...controls,
      gamepad: {
        ...controls.gamepad,
        [capture.action]: [...controls.gamepad[capture.action], binding]
      }
    });

    return true;
  }

  removeGamepad(event: Event) {
    const button = event.target;
    const settings = this.#settings;

    if (!(button instanceof HTMLButtonElement) || settings == null) {
      return;
    }

    const action = button.dataset["gamepadRemove"] as GameAction;
    const index = Number(button.dataset["index"]);
    const controls = settings.get("controls");

    settings.set("controls", {
      ...controls,
      gamepad: {
        ...controls.gamepad,
        [action]: controls.gamepad[action].filter((_, current) => current !== index)
      }
    });
  }

  resetControls() {
    this.#capture = null;
    this.#settings?.set("controls", structuredClone(defaultProjectSettings.controls));
    this.#error.textContent = "";
  }

  protected initHandlers() {
    this.parent.shadowRoot!.addEventListener("click", this.onAction, { signal: this.abortSignal });
    window.addEventListener("keydown", this.#handleKeyboardBinding, { capture: true, signal: this.abortSignal });
  }

  #getKeyboardBindingButton(action: GameAction): HTMLButtonElement {
    return this.parent.shadowRoot!.querySelector(`[data-keyboard-control="${action}"]`) as HTMLButtonElement;
  }

  #getGamepadAddButton(action: GameAction): HTMLButtonElement {
    return this.parent.shadowRoot!.querySelector(`[data-gamepad-add="${action}"]`) as HTMLButtonElement;
  }

  #renderGamepadBindings(action: GameAction, bindings: readonly GamepadBinding[]) {
    const container = this.parent.shadowRoot!.querySelector(`[data-gamepad-values="${action}"]`)!;
    container.replaceChildren();

    for (const [index, binding] of bindings.entries()) {
      const item = document.createElement("span");

      item.className = "gamepad-binding";
      item.append(this.#formatGamepadBinding(binding));

      const remove = document.createElement("button");

      remove.type = "button";
      remove.textContent = "×";
      remove.dataset["action"] = "removeGamepad";
      remove.dataset["gamepadRemove"] = action;
      remove.dataset["index"] = String(index);
      remove.setAttribute("aria-label", `Удалить ${this.#formatGamepadBinding(binding)}`);

      item.append(remove);
      container.append(item);
    }
  }

  #findActiveGamepadBinding(gamepad: Gamepad): GamepadBinding | null {
    for (let index = 0; index < gamepad.buttons.length; index++) {
      if (GamepadInput.isButtonPressed(gamepad, index)) {
        return { button: index };
      }
    }

    for (let index = 0; index < gamepad.axes.length; index++) {
      const value = gamepad.axes[index]!;

      if (Math.abs(value) >= 0.6) {
        return { axis: index, direction: value < 0 ? -1 : 1 };
      }
    }

    return null;
  }

  #areBindingsEqual(first: GamepadBinding, second: GamepadBinding): boolean {
    if ("button" in first && "button" in second) {
      return first.button === second.button;
    }

    return "axis" in first && "axis" in second &&
      first.axis === second.axis && first.direction === second.direction;
  }

  #formatGamepadBinding(binding: GamepadBinding): string {
    if ("button" in binding) {
      return `Кнопка ${binding.button}`;
    }

    return `Ось ${binding.axis} ${binding.direction < 0 ? "−" : "+"}`;
  }

  readonly #handleKeyboardBinding = (event: KeyboardEvent) => {
    const capture = this.#capture;

    if (capture?.device !== "keyboard") {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    this.#capture = null;

    if (event.code === "Escape") {
      this.sync();
      return;
    }

    const settings = this.#settings!;
    const controls = settings.get("controls");

    if (gameActions.some((action) => action !== capture.action && controls.keyboard[action] === event.code)) {
      this.#error.textContent = "Эта клавиша уже назначена.";
      this.sync();
      return;
    }

    settings.set("controls", {
      ...controls,
      keyboard: { ...controls.keyboard, [capture.action]: event.code }
    });
  };
}
