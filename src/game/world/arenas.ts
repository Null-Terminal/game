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
    street: streetSource,
    upper: upperSource,
    background: async () => ({ objects: (await parts).background, autoUnload: false })
  });

  arenas.preload(arenas.refs.background, arenas.refs.street);

  return arenas;

  async function streetSource(): Promise<ArenaDefinition> {
    const { street } = await parts;

    return {
      objects: [...street, ...World.of([[ArenaBoundaryObject, {
        bbox: [2600, 1050, 4700, 1350],
        axis: "y",
        threshold: 1200,
        direction: "increasing",
        isLoaded: (world: World) => world.arenas.getByRef(arenas.refs.upper)?.loaded === true,
        load: (world: World) => world.arenas.loadArena(arenas.refs.upper)
      }]])]
    };
  }

  async function upperSource(): Promise<ArenaDefinition> {
    const { upper } = await parts;

    return {
      objects: [
        ...upper,
        ...World.of([[ArenaBoundaryObject, {
          bbox: [2600, 1750, 4700, 2050],
          axis: "y",
          threshold: 1900,
          direction: "decreasing",
          isLoaded: (world: World) => world.arenas.getByRef(arenas.refs.street)?.loaded === true,
          load: (world: World) => world.arenas.loadArena(arenas.refs.street)
        }]]),

        ...World.of([[ArenaBoundaryObject, {
          bbox: [3500, 2050, 4300, 3000],
          axis: "x",
          threshold: 3900,
          direction: "decreasing",
          isLoaded: (world: World) => world.arenas.getByRef(arenas.refs.street)?.loaded === true,
          load: (world: World) => world.arenas.loadArena(arenas.refs.street)
        }]])
      ]
    };
  }
}

function enableDebug(objects: WorldObjects) {
  for (const [, options] of objects) {
    if (options != null) {
      options.debug = { ...options.debug, bounds: true, label: true, inspect: true };
    }
  }
}
