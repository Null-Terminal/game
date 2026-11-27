import type { FogAppearanceOptions } from "#game/background/fog-object/types";

export const hazeFog = {
  texture: { density: 12, seed: 0x4e2d9a71 },
  opacity: 0.25,
  speed: 1
} as const satisfies FogAppearanceOptions;

export const denseFog = {
  texture: { density: 36, seed: 0x4e2d9a71 },
  opacity: 0.75,
  speed: 3,
  flow: true,
  sway: 2
} as const satisfies FogAppearanceOptions;
