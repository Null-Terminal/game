import { WallObject } from "#game/wall-object";
import { FillerObject } from "#game/filler-object";

import { UsefulObject } from "#game/useful-object";
import { PlatformObject } from "#game/platform-object";
import { FallingPlatformObject } from "#game/falling-platform-object";

import { FloorObject } from "#game/floor-object";

import { World } from "#engine/game";

export const world = World.of([
  [FillerObject, { show: "night", stretch: "wh", static: "h", scrollFactor: [0.5] }],
  [FillerObject, { show: "night", stretch: "w", static: "h", scrollFactor: [0.5] }],

  [WallObject, { bbox: [0, -Infinity, 1, Infinity] }],

  [FloorObject, { show: "asphalt" }],
  [FillerObject, { show: "meshFence", y: 140, stretch: "w" }],

  [WallObject, { show: "bricks", bbox: [160, 220, 340, 240] }],
  [WallObject, { show: "bricks", bbox: [380, 340, 560, 360] }],
  [WallObject, { show: "bricks", bbox: [640, 500, 900, 520] }],

  [UsefulObject, { show: "fuel", x: 240, y: 280 }],
  [UsefulObject, { show: "fuel", x: 470, y: 410 }],
  [UsefulObject, { show: "fuel", x: 760, y: 570 }],

  // Сразу, с задержкой, по пути, по синусу до контакта.
  [FallingPlatformObject, { name: "fall", bbox: [960, 488, 1080, 520] }],

  [FallingPlatformObject, {
    name: "fall-delay",
    fallAfterSeconds: 2,
    bbox: [1120, 488, 1240, 520]
  }],

  [FallingPlatformObject, {
    name: "fall-path",
    fallAfterSeconds: 1,
    bbox: [1280, 488, 1400, 520],

    movement: {
      path: [
        [1280, 488],
        [1280, 680]
      ],

      speed: 140
    }
  }],

  [FallingPlatformObject, {
    name: "fall-sine-x",
    fallAfterSeconds: 1.5,
    bbox: [1500, 488, 1620, 520],

    movement: {
      sine: {
        axis: "x",
        amplitude: 24,
        length: 70,
        period: 3,
        origin: [1500, 488]
      }
    }
  }],

  [WallObject, { show: "bricks", bbox: [1700, 488, 1880, 508] }],
  [UsefulObject, { show: "fuel", x: 1760, y: 560 }],

  [PlatformObject, {
    name: "path-slow",
    bbox: [1960, 460, 2080, 492],

    movement: {
      path: [
        [1960, 460],
        [2200, 460],
        [2200, 620],
        [1960, 620]
      ],

      speed: 80,
      tolerance: 4
    }
  }],

  [PlatformObject, {
    name: "path-fast",
    bbox: [2400, 500, 2520, 532],

    movement: {
      path: [
        [2400, 500],
        [2680, 620],
        [2400, 740],
        [2680, 500]
      ],

      speed: 380,
      tolerance: 64
    }
  }],

  [WallObject, { show: "bricks", bbox: [2860, 500, 3040, 520] }],

  [PlatformObject, {
    name: "sine-y",
    bbox: [3120, 540, 3240, 572],

    movement: {
      sine: {
        axis: "y",
        amplitude: 40,
        length: 160,
        period: 4,
        origin: [3120, 540]
      }
    },

    accept: {
      trigger: [UsefulObject, { show: "trigger", x: 2920, y: 540 }]
    }
  }],

  [PlatformObject, {
    name: "sine-x",
    bbox: [3400, 600, 3520, 632],

    movement: {
      sine: {
        axis: "x",
        amplitude: 48,
        length: 220,
        period: 4,
        origin: [3400, 600]
      }
    }
  }],

  [PlatformObject, {
    name: "circle",
    bbox: [4000, 560, 4120, 592],

    movement: {
      circle: {
        center: [3920, 560],
        radius: 80,
        period: 5
      }
    }
  }],

  [UsefulObject, { show: "fuel", x: 3960, y: 720 }],

  [PlatformObject, {
    name: "triangle",
    bbox: [4280, 520, 4400, 552],

    movement: {
      at: triangle,
      speed: 120
    }
  }]
]);

function triangle(t: number): [number, number] {
  const points: [number, number][] = [
    [4280, 520],
    [4520, 520],
    [4400, 700]
  ];

  const lengths = points.map((point, index) => {
    const next = points[(index + 1) % points.length]!;
    return Math.hypot(next[0] - point[0], next[1] - point[1]);
  });

  const total = lengths.reduce((sum, length) => sum + length, 0);
  let distance = ((t % total) + total) % total;

  for (let index = 0; index < points.length; index++) {
    const edge = lengths[index]!;

    if (distance > edge) {
      distance -= edge;
      continue;
    }

    const from = points[index]!;
    const to = points[(index + 1) % points.length]!;
    const ratio = edge === 0 ? 0 : distance / edge;

    return [
      from[0] + (to[0] - from[0]) * ratio,
      from[1] + (to[1] - from[1]) * ratio
    ];
  }

  return points[0]!;
}
