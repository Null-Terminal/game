import type { DefaultBackgroundObjectOptions } from "#engine/game-objects/background-object/types";

export function getBackgroundScrollFactor(options: DefaultBackgroundObjectOptions, axis: "w" | "h"): number {
  if (options.static?.includes(axis)) {
    return 0;
  }

  const { scrollFactor } = options;

  return axis === "w" ?
    scrollFactor?.[0] ?? 1 :
    scrollFactor?.[1] ?? scrollFactor?.[0] ?? 1;
}
