import { GamepadInput, Input, type GamepadBinding, type InputBindings } from "#engine/input";
import { gameActions, type GameAction } from "#game/input/types";

import type { Game } from "#engine/game";
import type { ProjectControls, ProjectSettings } from "#game/settings";

export type { GameAction } from "#game/input/types";

export class GameInput extends Input<GameAction> {
  constructor(game: Game<ProjectSettings>) {
    super(gameActions, controlsToBindings(game.settings.get("controls")), {
      active: () => game.status.playing && game.hasWorld
    });

    GamepadInput.setPreferredId(game.settings.get("gamepadId"));

    this.onDestroy(this.events.press.on((action) => {
      if (action === "pause") {
        game.status.pause();
      }
    }));

    this.onDestroy(game.canvas.events.ui.on(() => this.clearPresses()));

    this.onDestroy(game.canvas.events.pauseChange.on((paused) => {
      if (paused) {
        this.clear();

      } else {
        this.gamepad.blockHeld();
      }
    }));

    this.onDestroy(game.settings.events.change.on((key) => {
      if (key === "controls") {
        this.setBindings(controlsToBindings(game.settings.get("controls")));

      } else if (key === "gamepadId") {
        GamepadInput.setPreferredId(game.settings.get("gamepadId"));
      }
    }));
  }
}

function controlsToBindings(controls: ProjectControls): InputBindings<GameAction> {
  const keyboard = new Map<string, GameAction>();
  const gamepad = new Map<GamepadBinding, GameAction>();

  for (const action of gameActions) {
    keyboard.set(controls.keyboard[action], action);

    for (const binding of controls.gamepad[action]) {
      gamepad.set(binding, action);
    }
  }

  return { keyboard, gamepad };
}
