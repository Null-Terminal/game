import { foldDeps } from "#/utils/fold-deps";

const _ = await foldDeps({
  moundTireA: import("#/sprites/terrain/mound-tire-a"),
  moundRubble: import("#/sprites/terrain/mound-rubble"),
  moundTireB: import("#/sprites/terrain/mound-tire-b")
});

export const moundEdgeDebris = [
  _.moundTireA,
  _.moundRubble,
  _.moundTireB
] as const;
