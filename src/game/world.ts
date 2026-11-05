import { World, type WorldObjects } from "#engine/game";

import {
  BackgroundFlowObject,
  BackgroundObject,
  StaticObject,
  type BackgroundObjectDebugOptions
} from "#engine/game-objects";

import { FogObject } from "#game/background/fog-object";
import { SkyObject, duskSky } from "#game/background/sky-object";

import { distantCity } from "#game/background/presets/distant-city";
import { citySkyline } from "#game/background/presets/city-skyline";
import { farRoadsideScenery } from "#game/background/presets/far-roadside-scenery";
import { roadsideStructures } from "#game/background/presets/roadside-structures";

import { nearRoadsideScenery } from "#game/background/presets/near-roadside-scenery";
import { nearRoadVegetation } from "#game/background/presets/near-road-vegetation";
import { nearRoadWrecks } from "#game/background/presets/near-road-wrecks";

import { moundEdgeDebris } from "#game/background/presets/mound-edge-debris";
import { curbDebris } from "#game/background/presets/curb-debris";

import { ControlObject } from "#game/control-object";
import { LiquidObject } from "#game/liquid-object";
import { PickupObject } from "#game/pickup-object";

import { ElevatorObject, industrialElevator } from "#game/platforms/elevator-object";
import { FallingPlatformObject } from "#game/platforms/falling-platform-object";
import { PlatformObject } from "#game/platforms/platform-object";

import { terminalStand } from "#/sprites/interactables/terminal-stand";

import { barrel } from "#/sprites/platforms/barrel";
import { elevatorShaft } from "#/sprites/platforms/elevator/shaft";
import { hoverDisc } from "#/sprites/platforms/hover-disc";
import { scaffoldFrame } from "#/sprites/platforms/scaffold-frame";
import { scaffoldPlank } from "#/sprites/platforms/scaffold-plank";

import { asphalt } from "#/sprites/terrain/asphalt";
import { roadsideGround } from "#/sprites/terrain/roadside-ground";
import { sidewalk } from "#/sprites/terrain/sidewalk";

const floors = [[-Infinity, Infinity]] as const;
const fogTexture = { density: 22, seed: 0x4e2d9a71 } as const;

export function createDemoWorld(showSeams = false): WorldObjects {
  const backdropDebug: BackgroundObjectDebugOptions = { stretchSeams: showSeams };
  const objects: WorldObjects = World.of([
    // Небо: звёзды, редкие молнии, облака и дальние ступенчатые полосы.
    [SkyObject, {
      show: "sky",
      celestialScrollFactor: 0,
      ...duskSky,
      dusk: { ...duskSky.dusk, bandsOpacity: 0.45 },
      moon: { ...duskSky.moon, position: [0.85, 0.15], radius: 70, haloRadius: 120, haloOpacity: 0.35 },
      clouds: { ...duskSky.clouds, clusters: 10, density: 6, opacity: 0.75 }
    }],

    // Самая дальняя панорама города и слабая дымка перед следующим слоем.
    [BackgroundFlowObject, { sprites: distantCity, y: 145, stretch: "w", debug: backdropDebug, scrollFactor: [0.06, 0.18], effects: { scale: 0.7 } }],
    [FogObject, {
      show: "fog", bbox: [-Infinity, 266, Infinity, 353], texture: fogTexture,
      opacity: 0.25, speed: 1, scrollFactor: [0.08, 0.18], sway: 1
    }],

    // Высокие здания и лёгкий туман перед придорожной застройкой.
    [BackgroundFlowObject, { sprites: citySkyline, x: -295, y: 135, debug: backdropDebug, order: "shuffle", gap: [300, 700], seed: 32, scrollFactor: [0.16, 0.55], effects: { scale: 0.9 } }],
    [FogObject, {
      show: "fog", bbox: [-Infinity, 259, Infinity, 346], texture: fogTexture,
      opacity: 0.3, speed: 2, scrollFactor: [0.2, 0.55], sway: 1
    }],

    // Дальние стены, постройки и отдельные объекты за насыпью.
    [BackgroundFlowObject, { sprites: roadsideStructures, y: 245, stretch: "w", debug: backdropDebug, order: "shuffle", gap: [100, 310], seed: 41, scrollFactor: [0.25, 1], effects: { scale: 0.6 } }],
    [BackgroundFlowObject, { sprites: farRoadsideScenery, y: 245, debug: backdropDebug, gap: [700, 1400], seed: 73, scrollFactor: [0.25, 1], effects: { scale: 0.6 } }],

    // Дымка проходит перед дальними постройками и скрывается за насыпью.
    [FogObject, {
      show: "fog", bbox: [-Infinity, 225, Infinity, 430], texture: fogTexture,
      opacity: 0.75, speed: 3, scrollFactor: [0.25, 1], sway: 2, flow: true
    }],

    // Насыпь перекрывает основания дальних объектов. Дорога и тротуар лежат перед ней.
    [BackgroundObject, { show: roadsideGround, bbox: [-Infinity, 180, Infinity, 295], scrollFactor: [0.38, 1] }],

    [BackgroundObject, { show: asphalt, bbox: [-Infinity, -Infinity, Infinity, 245], stretch: "wh", debug: backdropDebug }],
    [StaticObject, { bbox: [-Infinity, 180, Infinity, 245] }],
    [BackgroundObject, { show: sidewalk, bbox: [-Infinity, 210, Infinity, 275] }],

    // Вода с нефтяной плёнкой и разлив кислоты на дороге
    [LiquidObject, { kind: "water", bbox: [2300, 210, 2510, 285] }],
    [LiquidObject, { kind: "acid", bbox: [4450, 210, 4660, 285] }],

    // Бочки ведут к строительным лесам, а повреждённая доска обрушивается под игроком
    [PlatformObject, { show: barrel, x: 650, y: 233 }],
    [PlatformObject, { show: barrel, x: 720, y: 233 }],
    [PlatformObject, { show: barrel, x: 785, y: 233 }],
    [PlatformObject, { show: barrel, x: 770, y: 307 }],

    [PlatformObject, { show: scaffoldPlank.intact, x: 886, y: 485 }],

    [FallingPlatformObject, {
      show: scaffoldPlank.intact,
      showBroken: scaffoldPlank.broken,
      fallAfterSeconds: 0.25,
      x: 1326,
      y: 485
    }],

    [PlatformObject, {
      show: hoverDisc,
      x: 1750,
      y: 360,
      movement: { sine: { axis: "x", amplitude: 12, length: 120, period: 5 } }
    }],

    [PlatformObject, {
      show: hoverDisc,
      x: 2100,
      y: 435,
      movement: { sine: { axis: "x", amplitude: 15, length: 90, period: 4 } }
    }],

    [ControlObject, {
      x: 550,
      y: 225,
      kind: "floorLever"
    }],

    [ControlObject, {
      x: 1450,
      y: 225,
      kind: "wallLever"
    }],

    [ControlObject, {
      x: 2500,
      y: 225,
      kind: "emergencyButton"
    }],

    [ControlObject, {
      x: 3300,
      y: 225,
      kind: "accessButton"
    }],

    [ControlObject, {
      x: 4790,
      y: 225,
      kind: "aiTerminal"
    }],

    [ControlObject, {
      x: 6480,
      y: 276,
      kind: "resistanceTerminal"
    }],

    [PickupObject, { kind: "fuel", x: 370, y: 270 }],
    [PickupObject, { kind: "medkit", x: 1200, y: 270 }],
    [PickupObject, { kind: "fuel", x: 2250, y: 270 }],
    [PickupObject, { kind: "medkit", x: 3650, y: 270 }],
    [PickupObject, { kind: "fuel", x: 5350, y: 270 }],
    [PickupObject, { kind: "medkit", x: 7000, y: 270 }],

    // Плотный туман лежит поверх покрытия дороги, но позади ближних предметов.
    [FogObject, {
      show: "fog", bbox: [-Infinity, -180, Infinity, 266], texture: { ...fogTexture, density: 24 },
      opacity: 0.45, speed: 12, scrollFactor: [0.38, 1], sway: 3, flow: true
    }],

    // Ближние предметы на насыпи и мусор вдоль её края.
    [BackgroundFlowObject, { sprites: nearRoadsideScenery, y: 275, debug: backdropDebug, order: "shuffle", gap: [175, 440], seed: 81, scrollFactor: [0.38, 1], effects: { scale: 0.6 } }],
    [BackgroundFlowObject, { sprites: moundEdgeDebris, y: 270, gap: [160, 400], seed: 97, scrollFactor: [0.38, 1] }],
    [BackgroundFlowObject, { sprites: curbDebris, y: 225, gap: [180, 360], seed: 193 }],

    [BackgroundObject, { show: terminalStand, x: 6458, y: 225 }],

    [BackgroundObject, { show: scaffoldFrame, x: 930, y: 225 }],
    [BackgroundObject, { show: scaffoldFrame, x: 1370, y: 225 }],

    [ElevatorObject, {
      ...industrialElevator,
      x: 2830,
      y: 225,
      stops: [[0, 0], [0, 600], [0, 1200]],
      speed: 180
    }],

    // [CityWindowObject, {}],

  ]) as WorldObjects;

  // Каркас лесов под четырьмя настилами, от земли до верхней остановки лифта
  for (let tier = 0; tier < 4; tier++) {
    for (let column = 0; column < 11; column++) {
      objects.push([BackgroundObject, {
        show: scaffoldFrame,
        x: 2730 + column * 165,
        y: 225 + tier * 300
      }]);
    }
  }

  // Шахта закрывает каркас лесов за кабинкой на всей высоте её хода
  for (let segment = 0; segment < 5; segment++) {
    objects.push([BackgroundObject, {
      show: elevatorShaft,
      x: 2815,
      y: 225 + segment * 330
    }]);
  }

  const fragileColumnsByTier = [[2, 4], [3, 5], [1, 4], [2, 5]];

  for (let tier = 0; tier < 4; tier++) {
    const y = 543 + tier * 300;

    for (let column = 0; column < 6; column++) {
      const x = 3020 + column * 250;

      if (fragileColumnsByTier[tier]!.includes(column)) {
        objects.push(...World.of([[FallingPlatformObject, {
          show: scaffoldPlank.intact,
          showBroken: scaffoldPlank.broken,
          fallAfterSeconds: 0.35,
          x,
          y
        }]]));

      } else {
        objects.push([PlatformObject, { show: scaffoldPlank.intact, x, y }]);
      }
    }
  }

  for (const [index, [left, right]] of floors.entries()) {
    // Передний план: машины и деревья на дороге перекрывают ноги персонажа.
    objects.push(...World.of([[BackgroundFlowObject, {
      sprites: nearRoadWrecks,
      bbox: [left, 75, right, 330],
      overlay: true,
      order: "shuffle",
      gap: [550, 900],
      seed: 111 + index,
      effects: { scale: 0.52 }
    }]]));

    objects.push(...World.of([[BackgroundFlowObject, {
      sprites: nearRoadVegetation,
      bbox: [left, 75, right, 330],
      overlay: true,
      order: "shuffle",
      gap: [500, 800],
      seed: 217 + index,
      effects: { scale: 0.38 }
    }]]));
  }

  // Низкая полоса скрывает основания машин и деревьев, сохраняя верх спрайтов чётким.
  objects.push(...World.of([[FogObject, {
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
