import { foldDeps } from "#/utils/fold-deps";

const _ = await foldDeps({
  carJunkyard: import("#game/sprites/backgrounds/midground/car-junkyard"),
  overflowingDumpsters: import("#game/sprites/backgrounds/midground/overflowing-dumpsters")
});

export const nearRoadWrecks = [
  _.carJunkyard,
  _.overflowingDumpsters
] as const;
