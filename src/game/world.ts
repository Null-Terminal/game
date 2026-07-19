import { WallObject } from "#game/wall-object";
import { FillerObject } from "#game/filler-object";

import { UsefulObject } from "#game/useful-object";
import { PlatformObject } from "#game/platform-object";

import { FloorObject } from "#game/floor-object";

import type { WorldObjects } from "#engine/game";

export const world: WorldObjects = [
  [FillerObject, { show: "night", stretchWidth: true, stretchHeight: true, staticScreen: true }],
  [FillerObject, { show: "night", stretchWidth: true, staticScreen: true }],

  [WallObject, { bbox: [0, -Infinity, 1, Infinity] }],

  [FloorObject, { show: "asphalt" }],
  [FillerObject, { show: "meshFence", y: 140, stretchWidth: true }],

  [WallObject, { show: "bricks", bbox: [100, 500, 300, 520] }],
  [WallObject, { show: "bricks", bbox: [360, 280, 560, 340] }],
  [WallObject, { show: "bricks", bbox: [700, 320, 900, 380] }],
  [WallObject, { show: "bricks", bbox: [170, 650, 360, 670] }],
  [WallObject, { show: "bricks", bbox: [1200, 440, 1600, 460] }],
  [WallObject, { show: "bricks", bbox: [1700, 260, 1860, 280] }],
  [WallObject, { show: "bricks", bbox: [900, 540, 950, 620] }],

  [UsefulObject, { show: "fuel", y: 1000, x: 500 }],
  [UsefulObject, { show: "fuel", y: 1000, x: 600 }],
  [UsefulObject, { show: "fuel", y: 1000, x: 700 }],

  [PlatformObject, {
    bbox: [350, 770, 430, 800],

    movement: {
      path: [
        [700, 700],
        [400, 500],
        [600, 600],
        [350, 770]
      ],

      speed: 300
    },

    accept: {
      trigger: [UsefulObject, { show: "trigger", y: 1000, x: 800 }],
    }
  }],
];
