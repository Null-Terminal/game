import { WallObject } from "#game/wall-object";

import type { WorldObjects } from "#engine/game/world";

export const staticWorld: WorldObjects = [
  { object: [WallObject], bbox: [0, 500, 3000, 600] },

  { object: [WallObject], bbox: [200, 100, 500, 120] },

  { object: [WallObject], bbox: [360, 280, 560, 340] },

  { object: [WallObject], bbox: [700, 240, 900, 300] },

  { object: [WallObject], bbox: [200, 400, 360, 420] },

  { object: [WallObject], bbox: [1200, 160, 1600, 180] },

  { object: [WallObject], bbox: [1700, 360, 1860, 380] },

  { object: [WallObject], bbox: [1000, 0, 1040, 80] },
];
