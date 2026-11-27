import { Arenas, World, type ArenaDefinition, type WorldObjects } from "#engine/game";

import { ArenaBoundaryObject } from "#game/world/arena-boundary-object";
import { createDemoParts } from "#game/world/parts";

export function createDemoArenas(showSeams = false, debug = false) {
  const parts = createDemoParts(showSeams).then((value) => {
    if (debug) {
      enableDebug(value.background);
      enableDebug(value.street);
      enableDebug(value.upper);
    }

    return value;
  });

  const arenas = Arenas.declare({
    street: async (): Promise<ArenaDefinition> => ({ objects: (await parts).street }),
    upper: async (): Promise<ArenaDefinition> => ({ objects: (await parts).upper }),
    background: async () => ({ objects: (await parts).background, autoUnload: false }),
    transitions: transitionSource
  });

  arenas.preload(arenas.refs.background, arenas.refs.street, arenas.refs.transitions);

  return arenas;

  function transitionSource(): ArenaDefinition {
    const objects = World.of([
      [ArenaBoundaryObject, {
        bbox: [2600, 1050, 4700, 3200],
        isLoaded: (world: World) => world.arenas.getByRef(arenas.refs.upper)?.loaded === true,
        load: (world: World) => world.arenas.loadArena(arenas.refs.upper)
      }],

      [ArenaBoundaryObject, {
        bbox: [2600, 1750, 4700, 2050],
        isLoaded: (world: World) => world.arenas.getByRef(arenas.refs.street)?.loaded === true,
        load: (world: World) => world.arenas.loadArena(arenas.refs.street)
      }],

      [ArenaBoundaryObject, {
        bbox: [3500, 2050, 4300, 3000],
        isLoaded: (world: World) => world.arenas.getByRef(arenas.refs.street)?.loaded === true,
        load: (world: World) => world.arenas.loadArena(arenas.refs.street)
      }]
    ]);

    if (debug) {
      enableDebug(objects);
    }

    return { objects, autoUnload: false };
  }
}

function enableDebug(objects: WorldObjects) {
  for (const [, options] of objects) {
    if (options != null) {
      options.debug = { ...options.debug, bounds: true, label: true, inspect: true };
    }
  }
}
