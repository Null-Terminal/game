import type { DefaultBackgroundObjectOptions } from "#engine/game-objects/background-object/types";

export function getBackgroundScrollFactor(opts: DefaultBackgroundObjectOptions, axis: "w" | "h"): number {
  if (opts.static?.includes(axis)) {
    return 0;
  }

  const { scrollFactor } = opts;

  return axis === "w" ?
    scrollFactor?.[0] ?? 1 :
    scrollFactor?.[1] ?? scrollFactor?.[0] ?? 1;
}
