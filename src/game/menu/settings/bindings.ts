import { DomActionHandlers } from "#lib/dom-action-handlers";
import { GamepadInput, type GamepadBinding } from "#engine/input";

import { gameActions, type GameAction } from "#game/input/types";
import { areBindingsEqual, formatGamepadBinding, getActiveGamepadBindings, getBindingKey } from "#game/menu/settings/gamepad-binding";
import { defaultProjectSettings } from "#game/settings";

import type { GameSettingsPanel } from "#game/menu/settings";

type Capture =
  | { device: "keyboard"; action: GameAction }
  | { device: "gamepad"; action: GameAction; held: Set<string> };

const actionLabels: Record<GameAction, string> = {
  left: "Влево",
  right: "Вправо",
  jump: "Прыжок",
  jetpack: "Джетпак",
  use: "Использовать",
  pause: "Пауза"
};

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
        keyboardButton.setAttribute("aria-label", `Назначить клавишу: ${actionLabels[action]}, сейчас ${controls.keyboard[action]}`);
      }

      if (capture?.device !== "gamepad") {
        addGamepadButton.textContent = "+";
        addGamepadButton.setAttribute("aria-label", `Добавить привязку геймпада: ${actionLabels[action]}`);
        delete addGamepadButton.dataset["capturing"];
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

    this.parent.cancelBindingCapture();
    const action = button.dataset["keyboardControl"] as GameAction;
    this.#capture = { device: "keyboard", action };
    button.textContent = "Нажмите клавишу…";
    button.setAttribute("aria-label", `Нажмите клавишу: ${actionLabels[action]}`);
    this.#error.textContent = "";
  }

  captureGamepad(event: Event) {
    const button = event.target;

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    this.parent.cancelBindingCapture();
    const action = button.dataset["gamepadAdd"] as GameAction;
    const gamepad = GamepadInput.getGamepad();
    const held = new Set(gamepad == null ? [] : getActiveGamepadBindings(gamepad).map(getBindingKey));
    this.#capture = { device: "gamepad", action, held };
    button.textContent = "Нажмите кнопку…";
    button.setAttribute("aria-label", `Нажмите кнопку геймпада: ${actionLabels[action]}`);
    button.dataset["capturing"] = "";
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
      return true;
    }

    this.#error.textContent = "";
    const active = getActiveGamepadBindings(gamepad);
    const activeKeys = new Set(active.map(getBindingKey));
    for (const key of capture.held) {
      if (!activeKeys.has(key)) {
        capture.held.delete(key);
      }
    }

    const binding = active.find((item) => !capture.held.has(getBindingKey(item)));
    if (binding == null) {
      return true;
    }

    this.#capture = null;

    const settings = this.#settings!;
    const controls = settings.get("controls");

    const duplicate = gameActions.find((action) =>
      controls.gamepad[action].some((item) =>
        areBindingsEqual(item, binding)));

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
      item.append(formatGamepadBinding(binding));

      const remove = document.createElement("button");

      remove.type = "button";
      remove.textContent = "×";
      remove.dataset["action"] = "removeGamepad";
      remove.dataset["gamepadRemove"] = action;
      remove.dataset["index"] = String(index);
      remove.setAttribute("aria-label", `Удалить ${formatGamepadBinding(binding)}: ${actionLabels[action]}`);

      item.append(remove);
      container.append(item);
    }
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
