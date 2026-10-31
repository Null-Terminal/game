import type { DefaultGameObjectOptions, ScrollFactor } from "#engine/game-objects";
import type { BBoxTuple } from "#engine/rtree";

import type { FogTextureOptions } from "#game/background/fog-object/texture";

export type { FogTextureOptions } from "#game/background/fog-object/texture";

export interface FogAppearanceOptions {
  texture: FogTextureOptions;
  opacity: number;
  speed: number;
  flow?: boolean;
  sway?: number;
}

export interface FogObjectOptions extends DefaultGameObjectOptions, Partial<FogAppearanceOptions> {
  bbox: BBoxTuple;
  overlay?: boolean;
  scrollFactor?: ScrollFactor;
}
