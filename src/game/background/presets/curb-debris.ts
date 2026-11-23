import { foldDeps } from "#/utils/fold-deps";

const _ = await foldDeps({
  curbRubble: import("#game/sprites/terrain/curb-rubble"),
  curbCan: import("#game/sprites/terrain/curb-can"),
  curbBottle: import("#game/sprites/terrain/curb-bottle")
});

export const curbDebris = [
  _.curbRubble,
  _.curbCan,
  _.curbBottle
] as const;
