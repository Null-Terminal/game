import { Destroyable } from "#lib/destroyable";
import { GamepadInput, Input, type GamepadBinding, type InputBindings } from "#engine/input";
import { getDefaultMenuGamepadBindings, menuGamepadActions } from "#game/menu/gamepad-defaults";

import type { GameMenu } from "#game/menu";
import type { ProjectControls } from "#game/settings";

type MenuAction = "up" | "down" | "left" | "right" | "previousGroup" | "nextGroup" | "confirm" | "back" | "pause";

const menuActions: MenuAction[] = ["up", "down", "left", "right", "previousGroup", "nextGroup", "confirm", "back", "pause"];

export class MenuInput extends Destroyable {
  readonly #menu: GameMenu;
  readonly #input: Input<MenuAction>;

  #ready = false;
  #pollFrameId = 0;
  #activationTimeoutId = 0;
  #selectedGamepadSignature = "";
  #selectedControl: HTMLElement | null = null;

  constructor(menu: GameMenu) {
    super();

    const game = menu.game;

    if (game == null) {
      throw new Error(`${this.constructor.name}: game is not mounted`);
    }

    this.#menu = menu;
    this.#selectedGamepadSignature = this.#getGamepadSignature(GamepadInput.getGamepad());

    this.#input = this.onDestroy(new Input(menuActions, this.#createMenuBindings(game.settings.get("controls")), {
      active: () => !menu.hidden && this.#ready
    }));

    menu.shadowRoot!.addEventListener("pointerdown", this.#keepFocusOnBlankClick, { signal: this.abortSignal });

    this.onDestroy(game.settings.events.change.on((key) => {
      if (key === "controls" || key === "gamepadLayout" || key === "menuGamepadProfiles") {
        this.#input.setBindings(this.#createMenuBindings(game.settings.get("controls")));
      }
    }));
  }

  override destroy() {
    if (this.destroyed) {
      return;
    }

    this.deactivate();
    super.destroy();
  }

  activate() {
    this.#input.clear();
    this.#input.gamepad.blockHeld();
    this.#selectedControl = this.#getSelectedControl();

    this.#ready = false;
    this.#activationTimeoutId = setTimeout(() => {
      this.#activationTimeoutId = 0;
      this.#ready = !this.#menu.hidden;
    }, 0);

    this.#pollFrameId = requestAnimationFrame(() => this.#pollInput());
  }

  deactivate() {
    cancelAnimationFrame(this.#pollFrameId);
    this.#pollFrameId = 0;

    clearTimeout(this.#activationTimeoutId);
    this.#activationTimeoutId = 0;

    this.#ready = false;
    this.#input.clear();
  }

  #pollInput() {
    if (this.#menu.hidden) {
      return;
    }

    this.#updateGamepadStatus();

    if (this.#menu.settingsPanel.pollGamepadBindingCapture()) {
      this.#input.clear();
      this.#input.gamepad.blockHeld();

    } else {
      if (this.#input.consumePress("pause") || this.#input.consumePress("back")) {
        if (this.#menu.gameOverScreen.hidden) {
          if (this.#menu.settingsScreen.hidden) {
            if (this.#menu.game?.hasWorld) {
              this.#menu.game.status.resume();
            }

          } else {
            this.#menu.closeSettings();
          }
        }

      } else if (this.#input.consumePress("confirm")) {
        this.#activateFocusedControl();

      } else if (this.#input.consumePress("previousGroup")) {
        this.#moveGroup(-1);

      } else if (this.#input.consumePress("nextGroup")) {
        this.#moveGroup(1);

      } else if (this.#input.consumePress("up")) {
        this.#moveFocus(-1);

      } else if (this.#input.consumePress("down")) {
        this.#moveFocus(1);

      } else if (this.#input.consumePress("left")) {
        this.#adjustFocusedInput(-1);

      } else if (this.#input.consumePress("right")) {
        this.#adjustFocusedInput(1);
      }

      this.#input.clearPresses();
    }

    if (!this.#menu.hidden) {
      this.#pollFrameId = requestAnimationFrame(() => this.#pollInput());
    }
  }

  #updateGamepadStatus() {
    const gamepad = GamepadInput.getGamepad();
    const status = this.#menu.gamepadStatus;
    const vibrationAvailable = gamepad?.vibrationActuator?.playEffect != null;

    this.#menu.settingsPanel.syncGamepadDevices();

    const selectedGamepadSignature = this.#getGamepadSignature(gamepad);

    if (selectedGamepadSignature !== this.#selectedGamepadSignature) {
      this.#selectedGamepadSignature = selectedGamepadSignature;
      this.#input.setBindings(this.#createMenuBindings(this.#menu.game!.settings.get("controls")));
    }

    this.#menu.settingsPanel.setVibrationAvailable(vibrationAvailable);

    let message = "Геймпад не обнаружен. Нажмите любую кнопку на нём.";

    if (typeof navigator.getGamepads !== "function") {
      message = "Этот браузер не предоставляет доступ к геймпаду.";

    } else if (gamepad != null) {
      if (gamepad.mapping === "standard") {
        message = "Геймпад подключён.";

      } else {
        message = "Геймпад подключён без стандартной раскладки; кнопки могут отличаться.";
      }

      if (!vibrationAvailable) {
        message += " Вибрация через браузер недоступна.";
      }
    }

    if (status.textContent !== message) {
      status.textContent = message;
    }
  }

  #getFocusableControls(): HTMLElement[] {
    if (!this.#menu.gameOverScreen.hidden) {
      return [this.#menu.restartButton];
    }

    if (this.#menu.settingsScreen.hidden) {
      return [this.#menu.startButton, this.#menu.settingsButton];
    }

    return [
      this.#menu.backButton,
      ...this.#menu.settingsPanel.shadowRoot!.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled)"
      ).values().filter((control) => control.closest("[hidden]") == null)
    ];
  }

  #getFocusedControl(): Element | null {
    const active = this.#menu.shadowRoot!.activeElement;
    return active === this.#menu.settingsPanel ? this.#menu.settingsPanel.shadowRoot!.activeElement : active;
  }

  #getSelectedControl(): HTMLElement | null {
    const controls = this.#getFocusableControls();
    const focused = this.#getFocusedControl();

    if (focused instanceof HTMLElement && controls.includes(focused)) {
      this.#selectedControl = focused;

    } else if (!this.#selectedControl || !controls.includes(this.#selectedControl)) {
      this.#selectedControl = controls[0] ?? null;
    }

    return this.#selectedControl;
  }

  #moveFocus(direction: number) {
    const controls = this.#getFocusableControls();
    const current = controls.indexOf(this.#getSelectedControl()!);
    const next = (current + direction + controls.length) % controls.length;
    this.#selectedControl = controls[next] ?? null;
    this.#selectedControl?.focus();
  }

  #moveGroup(direction: number) {
    if (this.#menu.settingsScreen.hidden) {
      return;
    }

    const groups = [...this.#menu.settingsPanel.shadowRoot!.querySelectorAll(".groups > section:not([hidden])")];
    const controls = this.#getFocusableControls();
    const selected = this.#getSelectedControl();
    const current = groups.findIndex((group) => selected != null && group.contains(selected));
    let next: number;

    if (current < 0) {
      next = direction > 0 ? 0 : groups.length - 1;

    } else {
      next = (current + direction + groups.length) % groups.length;
    }

    this.#selectedControl = controls.find((control) => groups[next]?.contains(control)) ?? null;
    this.#selectedControl?.focus();
  }

  #activateFocusedControl() {
    const focused = this.#getSelectedControl();
    focused?.focus();

    if (focused instanceof HTMLSelectElement && focused.length > 1) {
      focused.selectedIndex = (focused.selectedIndex + 1) % focused.length;
      focused.dispatchEvent(new Event("change", { bubbles: true }));

    } else if (focused instanceof HTMLButtonElement || focused instanceof HTMLInputElement && focused.type === "checkbox") {
      focused.click();
    }
  }

  #adjustFocusedInput(direction: number) {
    const focused = this.#getSelectedControl();
    focused?.focus();

    if (focused instanceof HTMLSelectElement) {
      focused.selectedIndex = Math.max(0, Math.min(focused.length - 1, focused.selectedIndex + direction));
      focused.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    if (!(focused instanceof HTMLInputElement) || focused.type !== "range" && focused.type !== "number") {
      return;
    }

    if (direction > 0) {
      focused.stepUp();

    } else {
      focused.stepDown();
    }

    focused.dispatchEvent(new Event(focused.type === "range" ? "input" : "change", { bubbles: true }));
  }

  readonly #keepFocusOnBlankClick = (event: Event) => {
    if (!(event instanceof PointerEvent) || event.pointerType !== "mouse") {
      return;
    }

    const target = event.composedPath()[0];
    if (target instanceof Element &&
      target.closest("button, input, select, textarea, a, label, [tabindex]") == null) {
      event.preventDefault();
    }
  };

  #getGamepadSignature(gamepad: Gamepad | null): string {
    return gamepad == null ? "" : `${gamepad.id}\0${gamepad.mapping}`;
  }

  #createMenuBindings(controls: ProjectControls): InputBindings<MenuAction> {
    const settings = this.#menu.game!.settings;
    const gamepadDevice = GamepadInput.getGamepad();
    const defaults = getDefaultMenuGamepadBindings(settings.get("gamepadLayout"), gamepadDevice);
    const profile = settings.get("menuGamepadProfiles").find(({ id }) => id === gamepadDevice?.id);
    const gamepad = new Map<GamepadBinding, MenuAction>([
      [{ axis: 1, direction: -1, threshold: 0.5 }, "up"],
      [{ button: 12 }, "up"],
      [{ axis: 1, direction: 1, threshold: 0.5 }, "down"],
      [{ button: 13 }, "down"],
      [{ axis: 0, direction: -1, threshold: 0.5 }, "left"],
      [{ button: 14 }, "left"],
      [{ axis: 0, direction: 1, threshold: 0.5 }, "right"],
      [{ button: 15 }, "right"]
    ]);

    for (const action of menuGamepadActions) {
      gamepad.set(profile?.bindings[action] ?? defaults[action], action);
    }

    for (const binding of controls.gamepad.pause) {
      gamepad.set(binding, "pause");
    }

    return {
      keyboard: new Map([[controls.keyboard.pause, "pause"]]),
      gamepad
    };
  }
}
