import { foldDeps } from "#/utils/fold-deps";

const _ = await foldDeps({
  brickWall: import("#/sprites/backgrounds/midground/repeatable-brick-wall"),
  barbedWireFence: import("#/sprites/backgrounds/midground/barbed-wire-fence"),
  breachedPerimeterWall: import("#/sprites/backgrounds/midground/breached-perimeter-wall"),
  physicsWall: import("#/sprites/backgrounds/midground/physics-wall"),
  drainWall: import("#/sprites/backgrounds/midground/drain-wall")
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
