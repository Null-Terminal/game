import { foldDeps } from "#/utils/fold-deps";

const _ = await foldDeps({
  brickWall: import("#game/sprites/backgrounds/midground/repeatable-brick-wall"),
  barbedWireFence: import("#game/sprites/backgrounds/midground/barbed-wire-fence"),
  breachedPerimeterWall: import("#game/sprites/backgrounds/midground/breached-perimeter-wall"),
  physicsWall: import("#game/sprites/backgrounds/midground/physics-wall"),
  drainWall: import("#game/sprites/backgrounds/midground/drain-wall")
});

export const roadsideStructures = [
  _.repeatableBrickWall,
  _.barbedWireFence,
  _.repeatableBrickWall,
  _.breachedPerimeterWall,
  _.physicsWall,
  _.repeatableBrickWall,
  _.drainWall
] as const;
