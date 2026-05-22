import { WallObject } from "#game/wall-object";

import type { WorldObjects } from "#engine/game/world";

export const staticWorld: WorldObjects = [
  { object: [WallObject, { effects: { scale: 2 } }], bbox: [0, 250, 1500, 300] },

  { object: [WallObject, { effects: { scale: 2 } }], bbox: [100, 85, 270, 90] },

  { object: [WallObject, { effects: { scale: 2 } }], bbox: [180, 150, 280, 170] },

  { object: [WallObject, { effects: { scale: 2 } }], bbox: [350, 140, 450, 150] },

  { object: [WallObject, { effects: { scale: 2 } }], bbox: [100, 200, 180, 210] },

  { object: [WallObject, { effects: { scale: 2 } }], bbox: [600, 80, 800, 90] },

  { object: [WallObject, { effects: { scale: 2 } }], bbox: [850, 180, 930, 190] },

  { object: [WallObject, { effects: { scale: 2 } }], bbox: [500, 0, 520, 40] },
];
