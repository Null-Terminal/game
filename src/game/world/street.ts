import type { WorldObjects } from "#engine/game";

import { foldDeps } from "#/utils/fold-deps";

const deps = {
  game: import("#engine/game"),
  objects: import("#engine/game-objects"),

  control: import("#game/interactables/control-object"),
  arenaTerminal: import("#game/world/street/arena-terminal-object"),
  liquid: import("#game/liquids/liquid-object"),
  pickup: import("#game/interactables/pickup-object"),

  elevator: import("#game/platforms/elevator-object"),
  fallingPlatform: import("#game/platforms/falling-platform-object"),
  platform: import("#game/platforms/platform-object"),

  terminalStand: import("#game/sprites/interactables/terminal-stand"),

  barrel: import("#game/sprites/platforms/barrel"),
  elevatorShaft: import("#game/sprites/platforms/elevator/shaft"),
  hoverDisc: import("#game/sprites/platforms/hover-disc"),
  scaffoldFrame: import("#game/sprites/platforms/scaffold-frame"),
  scaffoldPlank: import("#game/sprites/platforms/scaffold-plank")
};

export async function createStreet(): Promise<WorldObjects> {
  const _ = await foldDeps(deps);

  const street: WorldObjects = _.World.of([
    [_.ElevatorObject, {
      ..._.industrialElevator,
      x: 2830,
      y: 225,
      stops: [[0, 0], [0, 600], [0, 1200], [0, 1800], [0, 2400]],
      speed: 180
    }],

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

    [_.ArenaTerminalObject, {
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

    [_.BackgroundObject, { show: _.terminalStand, x: 6458, y: 225 }],

    [_.BackgroundObject, { show: _.scaffoldFrame, x: 930, y: 225 }],
    [_.BackgroundObject, { show: _.scaffoldFrame, x: 1370, y: 225 }]
  ]) as WorldObjects;

  // Каркас первых четырёх ярусов лесов.
  // Конечный bbox запекает повтор кадра по всей ширине ряда.
  for (let tier = 0; tier < 4; tier++) {
    const bottom = 225 + tier * 300;

    street.push(..._.World.of([[_.BackgroundObject, {
      show: _.scaffoldFrame,
      stretch: "w",
      bbox: [2730, bottom, 2730 + 11 * _.scaffoldFrame.maxWidth, bottom + _.scaffoldFrame.maxHeight]
    }]]));
  }

  // Шахта пересекает границу арен, поэтому остаётся вместе с лифтом
  street.push(..._.World.of([[_.BackgroundObject, {
    show: _.elevatorShaft,
    stretch: "h",
    bbox: [2815, 225, 2815 + _.elevatorShaft.maxWidth, 225 + 10 * _.elevatorShaft.maxHeight]
  }]]));

  // Номера колонок с ломкими досками на каждом ярусе
  const fragileColumnsByTier = [[2, 4], [3, 5], [1, 4], [2, 5]];

  for (let tier = 0; tier < 4; tier++) {
    const y = 543 + tier * 300;

    for (let column = 0; column < 6; column++) {
      const x = 3020 + column * 250;

      if (fragileColumnsByTier[tier]!.includes(column)) {
        street.push(..._.World.of([[_.FallingPlatformObject, {
          show: _.scaffoldPlank.intact,
          showBroken: _.scaffoldPlank.broken,
          fallAfterSeconds: 0.35,
          x,
          y
        }]]));

      } else {
        street.push([_.PlatformObject, { show: _.scaffoldPlank.intact, x, y }]);
      }
    }
  }
  return street;
}
