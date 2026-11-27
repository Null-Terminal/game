import type { Game } from "#engine/game";
import type { GamepadBinding } from "#engine/input";
import type { GameInput } from "#game/input";
import type { GameAction } from "#game/input/types";

export interface ProjectControls {
  keyboard: Record<GameAction, string>;
  gamepad: Record<GameAction, GamepadBinding[]>;
}

export type MenuGamepadAction = "confirm" | "back" | "previousGroup" | "nextGroup";

export interface MenuGamepadProfile {
  id: string;
  bindings: Partial<Record<MenuGamepadAction, GamepadBinding>>;
}

export interface ProjectSettings {
  dynamicEffects: boolean;
  vibrationIntensity: number;
  gamepadLayout: "playstation" | "xbox";
  gamepadId: string;
  menuGamepadProfiles: MenuGamepadProfile[];
  controls: ProjectControls;
}

export type ProjectGame = Game<ProjectSettings, GameInput>;
