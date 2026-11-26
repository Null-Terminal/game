import type { GameSleepOptions } from "#engine/game/sleep/types";

export interface GameOptions {
  startPaused?: boolean;
  sleep?: GameSleepOptions;
}
