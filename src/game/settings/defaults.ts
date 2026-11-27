import type { ProjectSettings } from "#game/settings/types";

export const defaultDistanceScreens = {
  sleep: 3,
  arenaUnload: 0.75
} as const;

export const defaultProjectSettings: ProjectSettings = {
  dynamicEffects: true,
  vibrationIntensity: 1,
  gamepadLayout: "playstation",
  gamepadId: "",
  menuGamepadProfiles: [],
  controls: {
    keyboard: {
      left: "ArrowLeft",
      right: "ArrowRight",
      jump: "Space",
      jetpack: "ArrowUp",
      use: "KeyE",
      pause: "Escape"
    },

    gamepad: {
      left: [{ axis: 0, direction: -1 }, { button: 14 }],
      right: [{ axis: 0, direction: 1 }, { button: 15 }],
      jump: [{ button: 0 }],
      jetpack: [{ button: 1 }],
      use: [{ button: 2 }],
      pause: [{ button: 9 }]
    }
  }
};
