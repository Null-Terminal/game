import { WallObject } from "#game/wall-object";
import { InvisibleWallObject } from "#game/invisible-wall-object";

import type { WorldObjects } from "#engine/game/world";

export const staticWorld: WorldObjects = [
  [InvisibleWallObject, { bbox: [0, 130, 3000, 135] }],
  [WallObject, { bbox: [200, 400, 500, 420] }],
  [WallObject, { bbox: [360, 180, 560, 240] }],
  [WallObject, { bbox: [700, 220, 900, 280] }],
  [WallObject, { bbox: [170, 550, 360, 570] }],
  [WallObject, { bbox: [1200, 340, 1600, 360] }],
  [WallObject, { bbox: [1700, 160, 1860, 180] }],
  [WallObject, { bbox: [1000, 440, 1040, 520] }],
];
