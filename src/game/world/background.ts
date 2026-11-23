import type { WorldObjects } from "#engine/game";
import type { BackgroundObjectDebugOptions } from "#engine/game-objects";

import { foldDeps } from "#/utils/fold-deps";

const deps = {
  game: import("#engine/game"),
  objects: import("#engine/game-objects"),

  fog: import("#game/background/fog-object"),
  sky: import("#game/background/sky-object"),
  windDebris: import("#game/background/wind-debris-object"),

  distantCity: import("#game/background/presets/distant-city"),
  citySkyline: import("#game/background/presets/city-skyline"),
  farRoadsideScenery: import("#game/background/presets/far-roadside-scenery"),
  roadsideStructures: import("#game/background/presets/roadside-structures"),
  nearRoadsideScenery: import("#game/background/presets/near-roadside-scenery"),
  nearRoadVegetation: import("#game/background/presets/near-road-vegetation"),
  nearRoadWrecks: import("#game/background/presets/near-road-wrecks"),
  moundEdgeDebris: import("#game/background/presets/mound-edge-debris"),
  curbDebris: import("#game/background/presets/curb-debris"),

  asphalt: import("#game/sprites/terrain/asphalt"),
  roadsideGround: import("#game/sprites/terrain/roadside-ground"),
  sidewalk: import("#game/sprites/terrain/sidewalk")
};

const floors = [[-Infinity, Infinity]] as const;
const fogTexture = { density: 22, seed: 0x4e2d9a71 } as const;

export async function createBackground(showSeams: boolean): Promise<WorldObjects> {
  const _ = await foldDeps(deps);

  const backdropDebug: BackgroundObjectDebugOptions = { stretchSeams: showSeams };
  const background: WorldObjects = _.World.of([
    // Небо: звёзды, редкие молнии, облака и дальние ступенчатые полосы
    [_.SkyObject, {
      show: "sky",
      celestialScrollFactor: 0,
      ..._.duskSky,
      dusk: { ..._.duskSky.dusk, bandsOpacity: 0.45 },
      moon: { ..._.duskSky.moon, position: [0.85, 0.15], radius: 70, haloRadius: 120, haloOpacity: 0.35 },
      clouds: { ..._.duskSky.clouds, clusters: 10, density: 6, opacity: 0.75 }
    }]
  ]) as WorldObjects;

  background.push(..._.World.of([
    // Самая дальняя панорама города и слабая дымка перед следующим слоем
    [_.BackgroundFlowObject, { sprites: _.distantCity, y: 145, stretch: "w", debug: backdropDebug, scrollFactor: [0.06, 0.18], effects: { scale: 0.7 } }],
    [_.FogObject, {
      show: "fog", bbox: [-Infinity, 266, Infinity, 353], texture: fogTexture,
      opacity: 0.25, speed: 1, scrollFactor: [0.08, 0.18], sway: 1
    }],

    // Высокие здания и лёгкий туман перед придорожной застройкой
    [_.BackgroundFlowObject, { sprites: _.citySkyline, x: -295, y: 135, debug: backdropDebug, order: "shuffle", gap: [300, 700], seed: 32, scrollFactor: [0.16, 0.55], effects: { scale: 0.9 } }],
    [_.FogObject, {
      show: "fog", bbox: [-Infinity, 259, Infinity, 346], texture: fogTexture,
      opacity: 0.3, speed: 2, scrollFactor: [0.2, 0.55], sway: 1
    }],

    // Дальние стены, постройки и отдельные объекты за насыпью
    [_.BackgroundFlowObject, { sprites: _.roadsideStructures, y: 245, stretch: "w", debug: backdropDebug, order: "shuffle", gap: [100, 310], seed: 41, scrollFactor: [0.25, 1], effects: { scale: 0.6 } }],
    [_.BackgroundFlowObject, { sprites: _.farRoadsideScenery, y: 245, debug: backdropDebug, gap: [700, 1400], seed: 73, scrollFactor: [0.25, 1], effects: { scale: 0.6 } }],

    // Дымка проходит перед дальними постройками и скрывается за насыпью
    [_.FogObject, {
      show: "fog", bbox: [-Infinity, 225, Infinity, 430], texture: fogTexture,
      opacity: 0.75, speed: 3, scrollFactor: [0.25, 1], sway: 2, flow: true
    }],

    // Насыпь перекрывает основания дальних объектов. Дорога и тротуар лежат перед ней
    [_.BackgroundObject, { show: _.roadsideGround, bbox: [-Infinity, 180, Infinity, 295], scrollFactor: [0.38, 1] }],

    [_.BackgroundObject, { show: _.asphalt, bbox: [-Infinity, -Infinity, Infinity, 245], stretch: "wh", debug: backdropDebug }],
    [_.ColliderObject, { bbox: [-Infinity, 180, Infinity, 245] }],
    [_.BackgroundObject, { show: _.sidewalk, bbox: [-Infinity, 210, Infinity, 275] }]
  ]));

  background.push(..._.World.of([
    // Туман и движущийся мусор остаются частью постоянно загруженного фона
    [_.FogObject, {
      show: "fog", bbox: [-Infinity, -180, Infinity, 266], texture: { ...fogTexture, density: 24 },
      opacity: 0.45, speed: 12, scrollFactor: [0.38, 1], sway: 3, flow: true
    }],
    [_.WindDebrisObject, { show: "road" }],
    [_.BackgroundFlowObject, { sprites: _.nearRoadsideScenery, y: 275, debug: backdropDebug, order: "shuffle", gap: [175, 440], seed: 81, scrollFactor: [0.38, 1], effects: { scale: 0.6 } }],
    [_.BackgroundFlowObject, { sprites: _.moundEdgeDebris, y: 270, gap: [160, 400], seed: 97, scrollFactor: [0.38, 1] }],
    [_.BackgroundFlowObject, { sprites: _.curbDebris, y: 225, gap: [180, 360], seed: 193 }]
  ]));

  for (const [index, [left, right]] of floors.entries()) {
    // Передний план: машины и деревья на дороге перекрывают ноги персонажа
    background.push(..._.World.of([[_.BackgroundFlowObject, {
      sprites: _.nearRoadWrecks,
      bbox: [left, 75, right, 330],
      overlay: true,
      order: "shuffle",
      gap: [550, 900],
      seed: 111 + index,
      effects: { scale: 0.52 }
    }]]));

    background.push(..._.World.of([[_.BackgroundFlowObject, {
      sprites: _.nearRoadVegetation,
      bbox: [left, 75, right, 330],
      overlay: true,
      order: "shuffle",
      gap: [500, 800],
      seed: 217 + index,
      effects: { scale: 0.38 }
    }]]));
  }

  // Низкая полоса скрывает основания машин и деревьев, сохраняя верх спрайтов чётким
  background.push(..._.World.of([[_.FogObject, {
    show: "fog",
    bbox: [-Infinity, -100, Infinity, 200],
    texture: fogTexture,
    overlay: true,
    opacity: 0.45,
    speed: 5,
    scrollFactor: [1, 1],
    flow: true
  }]]));

  return background;
}
