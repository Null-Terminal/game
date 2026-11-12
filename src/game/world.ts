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

  control: import("#game/control-object"),
  liquid: import("#game/liquid-object"),
  pickup: import("#game/pickup-object"),

  elevator: import("#game/platforms/elevator-object"),
  fallingPlatform: import("#game/platforms/falling-platform-object"),
  platform: import("#game/platforms/platform-object"),

  terminalStand: import("#/sprites/interactables/terminal-stand"),

  barrel: import("#/sprites/platforms/barrel"),
  elevatorShaft: import("#/sprites/platforms/elevator/shaft"),
  hoverDisc: import("#/sprites/platforms/hover-disc"),
  scaffoldFrame: import("#/sprites/platforms/scaffold-frame"),
  scaffoldPlank: import("#/sprites/platforms/scaffold-plank"),

  asphalt: import("#/sprites/terrain/asphalt"),
  roadsideGround: import("#/sprites/terrain/roadside-ground"),
  sidewalk: import("#/sprites/terrain/sidewalk")
};

const floors = [[-Infinity, Infinity]] as const;
const fogTexture = { density: 22, seed: 0x4e2d9a71 } as const;

export async function createDemoWorld(showSeams = false): Promise<WorldObjects> {
  const _ = await foldDeps(deps);

  const backdropDebug: BackgroundObjectDebugOptions = { stretchSeams: showSeams };
  const objects: WorldObjects = _.World.of([
    // Небо: звёзды, редкие молнии, облака и дальние ступенчатые полосы
    [_.SkyObject, {
      show: "sky",
      celestialScrollFactor: 0,
      ..._.duskSky,
      dusk: { ..._.duskSky.dusk, bandsOpacity: 0.45 },
      moon: { ..._.duskSky.moon, position: [0.85, 0.15], radius: 70, haloRadius: 120, haloOpacity: 0.35 },
      clouds: { ..._.duskSky.clouds, clusters: 10, density: 6, opacity: 0.75 }
    }],

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

    // Насыпь перекрывает основания дальних объектов. Дорога и тротуар лежат перед ней.
    [_.BackgroundObject, { show: _.roadsideGround, bbox: [-Infinity, 180, Infinity, 295], scrollFactor: [0.38, 1] }],

    [_.BackgroundObject, { show: _.asphalt, bbox: [-Infinity, -Infinity, Infinity, 245], stretch: "wh", debug: backdropDebug }],
    [_.StaticObject, { bbox: [-Infinity, 180, Infinity, 245] }],
    [_.BackgroundObject, { show: _.sidewalk, bbox: [-Infinity, 210, Infinity, 275] }],

    // Вода с нефтяной плёнкой и разлив кислоты на дороге
    [_.LiquidObject, { kind: "water", bbox: [2300, 210, 2510, 285] }],
    [_.LiquidObject, { kind: "acid", bbox: [4450, 210, 4660, 285] }],

    // Бочки ведут к строительным лесам, а повреждённая доска обрушивается под игроком
    [_.PlatformObject, { show: _.barrel, x: 650, y: 233 }],
    [_.PlatformObject, { show: _.barrel, x: 720, y: 233 }],
    [_.PlatformObject, { show: _.barrel, x: 785, y: 233 }],
    [_.PlatformObject, { show: _.barrel, x: 770, y: 307 }],

    [_.PlatformObject, { show: _.scaffoldPlank.intact, x: 886, y: 485 }],

    [_.FallingPlatformObject, {
      show: _.scaffoldPlank.intact,
      showBroken: _.scaffoldPlank.broken,
      fallAfterSeconds: 0.25,
      x: 1326,
      y: 485
    }],

    [_.PlatformObject, {
      show: _.hoverDisc,
      x: 1750,
      y: 360,
      movement: { sine: { axis: "x", amplitude: 12, length: 120, period: 5 } }
    }],

    [_.PlatformObject, {
      show: _.hoverDisc,
      x: 2100,
      y: 435,
      movement: { sine: { axis: "x", amplitude: 15, length: 90, period: 4 } }
    }],

    [_.ControlObject, {
      x: 550,
      y: 225,
      kind: "floorLever"
    }],

    [_.ControlObject, {
      x: 1450,
      y: 225,
      kind: "wallLever"
    }],

    [_.ControlObject, {
      x: 2500,
      y: 225,
      kind: "emergencyButton"
    }],

    [_.ControlObject, {
      x: 3300,
      y: 225,
      kind: "accessButton"
    }],

    [_.ControlObject, {
      x: 4790,
      y: 225,
      kind: "aiTerminal"
    }],

    [_.ControlObject, {
      x: 6480,
      y: 276,
      kind: "resistanceTerminal"
    }],

    [_.PickupObject, { kind: "fuel", x: 370, y: 270 }],
    [_.PickupObject, { kind: "medkit", x: 1200, y: 270 }],
    [_.PickupObject, { kind: "fuel", x: 2250, y: 270 }],
    [_.PickupObject, { kind: "medkit", x: 3650, y: 270 }],
    [_.PickupObject, { kind: "fuel", x: 5350, y: 270 }],
    [_.PickupObject, { kind: "medkit", x: 7000, y: 270 }],

    // Плотный туман лежит поверх покрытия дороги, но позади ближних предметов
    [_.FogObject, {
      show: "fog", bbox: [-Infinity, -180, Infinity, 266], texture: { ...fogTexture, density: 24 },
      opacity: 0.45, speed: 12, scrollFactor: [0.38, 1], sway: 3, flow: true
    }],

    // Перекати-поле и редкая газета движутся порывами вдоль дороги
    [_.WindDebrisObject, { show: "road" }],

    // Ближние предметы на насыпи и мусор вдоль её края
    [_.BackgroundFlowObject, { sprites: _.nearRoadsideScenery, y: 275, debug: backdropDebug, order: "shuffle", gap: [175, 440], seed: 81, scrollFactor: [0.38, 1], effects: { scale: 0.6 } }],
    [_.BackgroundFlowObject, { sprites: _.moundEdgeDebris, y: 270, gap: [160, 400], seed: 97, scrollFactor: [0.38, 1] }],
    [_.BackgroundFlowObject, { sprites: _.curbDebris, y: 225, gap: [180, 360], seed: 193 }],

    [_.BackgroundObject, { show: _.terminalStand, x: 6458, y: 225 }],

    [_.BackgroundObject, { show: _.scaffoldFrame, x: 930, y: 225 }],
    [_.BackgroundObject, { show: _.scaffoldFrame, x: 1370, y: 225 }],

    [_.ElevatorObject, {
      ..._.industrialElevator,
      x: 2830,
      y: 225,
      stops: [[0, 0], [0, 600], [0, 1200]],
      speed: 180
    }],

  ]) as WorldObjects;

  // Каркас лесов под четырьмя настилами, от земли до верхней остановки лифта
  for (let tier = 0; tier < 4; tier++) {
    for (let column = 0; column < 11; column++) {
      objects.push([_.BackgroundObject, {
        show: _.scaffoldFrame,
        x: 2730 + column * 165,
        y: 225 + tier * 300
      }]);
    }
  }

  // Шахта закрывает каркас лесов за кабинкой на всей высоте её хода
  for (let segment = 0; segment < 5; segment++) {
    objects.push([_.BackgroundObject, {
      show: _.elevatorShaft,
      x: 2815,
      y: 225 + segment * 330
    }]);
  }

  // Номера колонок с ломкими досками на каждом ярусе
  const fragileColumnsByTier = [[2, 4], [3, 5], [1, 4], [2, 5]];

  for (let tier = 0; tier < 4; tier++) {
    const y = 543 + tier * 300;

    for (let column = 0; column < 6; column++) {
      const x = 3020 + column * 250;

      if (fragileColumnsByTier[tier]!.includes(column)) {
        objects.push(..._.World.of([[_.FallingPlatformObject, {
          show: _.scaffoldPlank.intact,
          showBroken: _.scaffoldPlank.broken,
          fallAfterSeconds: 0.35,
          x,
          y
        }]]));

      } else {
        objects.push([_.PlatformObject, { show: _.scaffoldPlank.intact, x, y }]);
      }
    }
  }

  for (const [index, [left, right]] of floors.entries()) {
    // Передний план: машины и деревья на дороге перекрывают ноги персонажа
    objects.push(..._.World.of([[_.BackgroundFlowObject, {
      sprites: _.nearRoadWrecks,
      bbox: [left, 75, right, 330],
      overlay: true,
      order: "shuffle",
      gap: [550, 900],
      seed: 111 + index,
      effects: { scale: 0.52 }
    }]]));

    objects.push(..._.World.of([[_.BackgroundFlowObject, {
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
  objects.push(..._.World.of([[_.FogObject, {
    show: "fog",
    bbox: [-Infinity, -100, Infinity, 200],
    texture: fogTexture,
    overlay: true,
    opacity: 0.45,
    speed: 5,
    scrollFactor: [1, 1],
    flow: true
  }]]));

  return objects;
}
