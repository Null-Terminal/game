import { foldDeps } from "#/utils/fold-deps";

const _ = await foldDeps({
  deadGrove: import("#game/sprites/backgrounds/midground/dead-grove"),
  deadShrubs: import("#game/sprites/backgrounds/midground/dead-shrubs")
});

export const nearRoadVegetation = [
  _.deadGrove,
  _.deadShrubs
] as const;
