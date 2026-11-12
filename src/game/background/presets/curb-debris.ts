import { foldDeps } from "#/utils/fold-deps";

const _ = await foldDeps({
  curbRubble: import("#/sprites/terrain/curb-rubble"),
  curbCan: import("#/sprites/terrain/curb-can"),
  curbBottle: import("#/sprites/terrain/curb-bottle")
});

export const curbDebris = [
  _.curbRubble,
  _.curbCan,
  _.curbBottle
] as const;
