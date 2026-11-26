import { Destroyable } from "#lib/destroyable";
import { GamepadInput, Input, type GamepadBinding, type InputBindings } from "#engine/input";

import type { GameMenu } from "#game/menu";
import type { ProjectControls } from "#game/settings";

type MenuAction = "up" | "down" | "left" | "right" | "confirm" | "back" | "pause";

const menuActions: MenuAction[] = ["up", "down", "left", "right", "confirm", "back", "pause"];

export class MenuInput extends Destroyable {
  readonly #menu: GameMenu;
  readonly #input: Input<MenuAction>;

  #ready = false;
  #pollFrameId = 0;
  #activationTimeoutId = 0;

  constructor(menu: GameMenu) {
    super();

    const game = menu.game;

    if (game == null) {
      throw new Error(`${this.constructor.name}: game is not mounted`);
    }

    this.#menu = menu;

    this.#input = this.onDestroy(new Input(menuActions, this.#createMenuBindings(game.settings.get("controls")), {
      active: () => !menu.hidden && this.#ready
    }));

    this.onDestroy(game.settings.events.change.on((key) => {
      if (key === "controls") {
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
        if (this.#menu.settingsScreen.hidden) {
          if (this.#menu.game?.hasWorld) {
            this.#menu.game.status.resume();
          }

        } else {
          this.#menu.closeSettings();
        }

      } else if (this.#input.consumePress("confirm")) {
        this.#activateFocusedControl();

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
    if (this.#menu.settingsScreen.hidden) {
      return [this.#menu.startButton, this.#menu.settingsButton];
    }

    return [
      this.#menu.backButton,
      ...this.#menu.settingsPanel.shadowRoot!.querySelectorAll<HTMLElement>(
        "button:not([data-keyboard-control]), input:not(:disabled)"
      )
    ];
  }

  #getFocusedControl(): Element | null {
    const active = this.#menu.shadowRoot!.activeElement;
    return active === this.#menu.settingsPanel ? this.#menu.settingsPanel.shadowRoot!.activeElement : active;
  }

  #moveFocus(direction: number) {
    const controls = this.#getFocusableControls();
    const current = controls.indexOf(this.#getFocusedControl() as HTMLElement);
    const next = (current + direction + controls.length) % controls.length;
    controls[next]?.focus();
  }

  #activateFocusedControl() {
    const focused = this.#getFocusedControl();

    if (focused instanceof HTMLButtonElement || focused instanceof HTMLInputElement && focused.type === "checkbox") {
      focused.click();
    }
  }

  #adjustFocusedInput(direction: number) {
    const focused = this.#getFocusedControl();

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

  #createMenuBindings(controls: ProjectControls): InputBindings<MenuAction> {
    const gamepad = new Map<GamepadBinding, MenuAction>([
      [{ axis: 1, direction: -1, threshold: 0.5 }, "up"],
      [{ button: 12 }, "up"],
      [{ axis: 1, direction: 1, threshold: 0.5 }, "down"],
      [{ button: 13 }, "down"],
      [{ axis: 0, direction: -1, threshold: 0.5 }, "left"],
      [{ button: 14 }, "left"],
      [{ axis: 0, direction: 1, threshold: 0.5 }, "right"],
      [{ button: 15 }, "right"],
      [{ button: 0 }, "confirm"],
      [{ button: 1 }, "back"]
    ]);

    for (const binding of controls.gamepad.pause) {
      gamepad.set(binding, "pause");
    }

    return {
      keyboard: new Map([[controls.keyboard.pause, "pause"]]),
      gamepad
    };
  }
}
