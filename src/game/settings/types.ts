import type { Game } from "#engine/game";
import type { GamepadBinding } from "#engine/input";
import type { GameInput } from "#game/input";
import type { GameAction } from "#game/input/types";

export interface ProjectControls {
  keyboard: Record<GameAction, string>;
  gamepad: Record<GameAction, GamepadBinding[]>;
}

export interface ProjectSettings {
  dynamicEffects: boolean;
  vibrationIntensity: number;
  controls: ProjectControls;
}

export type ProjectGame = Game<ProjectSettings, GameInput>;
