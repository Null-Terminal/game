import { WallObject } from "#game/wall-object";

import type { WorldObjects } from "#engine/game/world";

export const staticWorld: WorldObjects = [
  [WallObject, { bbox: [0, 130, 3000, 135] }],
  [WallObject, { show: "bricks", bbox: [100, 500, 300, 520] }],
  [WallObject, { show: "bricks", bbox: [360, 280, 560, 340] }],
  [WallObject, { show: "bricks", bbox: [700, 320, 900, 380] }],
  [WallObject, { show: "bricks", bbox: [170, 650, 360, 670] }],
  [WallObject, { show: "bricks", bbox: [1200, 440, 1600, 460] }],
  [WallObject, { show: "bricks", bbox: [1700, 260, 1860, 280] }],
  [WallObject, { show: "bricks", bbox: [900, 540, 950, 620] }],
];
