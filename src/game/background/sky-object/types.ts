import type { DefaultGameObjectOptions } from "#engine/game-objects";

import type { CloudsOptions } from "#game/background/sky-object/clouds";
import type { DuskOptions } from "#game/background/sky-object/dusk";
import type { LightningOptions } from "#game/background/sky-object/lightning";
import type { MoonOptions } from "#game/background/sky-object/moon";
import type { StarsOptions } from "#game/background/sky-object/stars";

export type { CloudsOptions } from "#game/background/sky-object/clouds";
export type { DuskBand, DuskOptions, DuskStop } from "#game/background/sky-object/dusk";
export type { LightningOptions } from "#game/background/sky-object/lightning";
export type { MoonOptions } from "#game/background/sky-object/moon";
export type { StarsOptions } from "#game/background/sky-object/stars";

export interface SkyCloudOptions extends CloudsOptions {
  // Скорость движения облаков в пикселях в секунду
  speed: number;
}

export interface SkySceneOptions {
  dusk?: DuskOptions;
  stars?: StarsOptions;
  lightning?: LightningOptions;
  moon?: MoonOptions;
  clouds?: SkyCloudOptions;
}

export interface SkyOptions extends DefaultGameObjectOptions, SkySceneOptions {
  // Общая доля движения камеры для звёзд и луны
  celestialScrollFactor?: number;
}
