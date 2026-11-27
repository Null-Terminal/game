import { GamepadInput } from "#engine/input";
import { DomActionHandlers } from "#lib/dom-action-handlers";
import { getDefaultMenuGamepadBindings, menuGamepadActions, menuGamepadLabels } from "#game/menu/gamepad-defaults";
import { areBindingsEqual, formatGamepadBinding, getActiveGamepadBindings, getBindingKey } from "#game/menu/settings/gamepad-binding";

import type { MenuGamepadAction } from "#game/settings";
import type { GameSettingsPanel } from "#game/menu/settings";

interface Capture {
  action: MenuGamepadAction;
  gamepadId: string;
  held: Set<string>;
}

export class MenuBindingActions extends DomActionHandlers<GameSettingsPanel> {
  #capture: Capture | null = null;

  get #settings() {
    return this.parent.game?.settings;
  }

  get #error(): HTMLElement {
    return this.parent.shadowRoot!.getElementById("menu-controls-error")!;
  }

  constructor(panel: GameSettingsPanel) {
    super(panel);
  }

  sync() {
    const settings = this.#settings;
    const gamepad = GamepadInput.getGamepad();
    const defaults = getDefaultMenuGamepadBindings(settings?.get("gamepadLayout") ?? "xbox", gamepad);
    const profile = settings?.get("menuGamepadProfiles").find(({ id }) => id === gamepad?.id);

    for (const action of menuGamepadActions) {
      const button = this.#getButton(action);
      button.disabled = gamepad == null || settings == null;

      if (this.#capture?.action !== action) {
        const binding = profile?.bindings[action] ?? defaults[action];
        button.textContent = formatGamepadBinding(binding);
        button.setAttribute("aria-label", `Назначить кнопку меню: ${menuGamepadLabels[action]}, сейчас ${formatGamepadBinding(binding)}`);
      }
    }

    const reset = this.parent.shadowRoot!.getElementById("reset-menu-gamepad") as HTMLButtonElement;
    reset.disabled = gamepad == null || profile == null;
  }

  cancelCapture() {
    this.#capture = null;
    this.sync();
  }

  captureMenuGamepad(event: Event) {
    const button = event.target;
    const gamepad = GamepadInput.getGamepad();

    if (!(button instanceof HTMLButtonElement) || gamepad == null || this.#settings == null) {
      return;
    }

    this.parent.cancelBindingCapture();
    const action = button.dataset["menuGamepad"] as MenuGamepadAction;
    this.#capture = {
      action,
      gamepadId: gamepad.id,
      held: new Set(getActiveGamepadBindings(gamepad).map(getBindingKey))
    };
    button.textContent = "Нажмите кнопку…";
    button.setAttribute("aria-label", `Нажмите кнопку геймпада: ${menuGamepadLabels[action]}`);
    this.#error.textContent = "";
  }

  pollGamepadCapture(): boolean {
    const capture = this.#capture;

    if (capture == null) {
      return false;
    }

    const gamepad = GamepadInput.getGamepad();

    if (gamepad?.id !== capture.gamepadId) {
      this.cancelCapture();
      this.#error.textContent = "Геймпад отключён или выбран другой.";
      return true;
    }

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

    const settings = this.#settings!;
    const profiles = settings.get("menuGamepadProfiles");
    const profile = profiles.find(({ id }) => id === capture.gamepadId);
    const defaults = getDefaultMenuGamepadBindings(settings.get("gamepadLayout"), gamepad);
    const duplicate = menuGamepadActions.some((action) => action !== capture.action &&
      areBindingsEqual(binding, profile?.bindings[action] ?? defaults[action])) ||
      settings.get("controls").gamepad.pause.some((item) => areBindingsEqual(item, binding)) ||
      [12, 13, 14, 15].some((button) => areBindingsEqual(binding, { button })) ||
      [0, 1].some((axis) => [-1, 1].some((direction) =>
        areBindingsEqual(binding, { axis, direction: direction as -1 | 1 })));

    this.#capture = null;
    if (duplicate) {
      this.sync();
      this.#error.textContent = "Эта кнопка или ось уже назначена в меню.";
      return true;
    }

    settings.set("menuGamepadProfiles", [
      ...profiles.filter(({ id }) => id !== capture.gamepadId),
      { id: capture.gamepadId, bindings: { ...profile?.bindings, [capture.action]: binding } }
    ]);
    this.#error.textContent = "";
    return true;
  }

  resetMenuGamepad() {
    const settings = this.#settings;
    const gamepad = GamepadInput.getGamepad();

    if (settings == null || gamepad == null) {
      return;
    }

    this.#capture = null;
    settings.set("menuGamepadProfiles", settings.get("menuGamepadProfiles").filter(({ id }) => id !== gamepad.id));
    this.#error.textContent = "";
  }

  protected initHandlers() {
    this.parent.shadowRoot!.addEventListener("click", this.onAction, { signal: this.abortSignal });
  }

  #getButton(action: MenuGamepadAction): HTMLButtonElement {
    return this.parent.shadowRoot!.querySelector(`[data-menu-gamepad="${action}"]`) as HTMLButtonElement;
  }
}
