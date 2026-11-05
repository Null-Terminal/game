import { repeatableBrickWall } from "#/sprites/backgrounds/midground/repeatable-brick-wall";
import { barbedWireFence } from "#/sprites/backgrounds/midground/barbed-wire-fence";
import { breachedPerimeterWall } from "#/sprites/backgrounds/midground/breached-perimeter-wall";
import { physicsWall } from "#/sprites/backgrounds/midground/physics-wall";
import { drainWall } from "#/sprites/backgrounds/midground/drain-wall";

export const roadsideStructures = [
  repeatableBrickWall,
  barbedWireFence,
  repeatableBrickWall,
  breachedPerimeterWall,
  physicsWall,
  repeatableBrickWall,
  drainWall
] as const;
