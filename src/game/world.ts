import { WallObject } from "#game/wall-object";
import { InvisibleWallObject } from "#game/invisible-wall-object";

import type { WorldObjects } from "#engine/game/world";

export const staticWorld: WorldObjects = [
  [InvisibleWallObject, { bbox: [0, 130, 3000, 135] }],
  [WallObject, { bbox: [100, 500, 300, 520] }],
  [WallObject, { bbox: [360, 280, 560, 340] }],
  [WallObject, { bbox: [700, 320, 900, 380] }],
  [WallObject, { bbox: [170, 650, 360, 670] }],
  [WallObject, { bbox: [1200, 440, 1600, 460] }],
  [WallObject, { bbox: [1700, 260, 1860, 280] }],
  [WallObject, { bbox: [900, 540, 950, 620] }],
];
