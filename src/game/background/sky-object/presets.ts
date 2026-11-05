import type { SkySceneOptions } from "#game/background/sky-object/types";

export const duskSky = {
  dusk: {
    gradient: [
      [0, "#261740"],
      [0.34, "#40305F"],
      [0.62, "#79547F"],
      [0.79, "#C87D8A"],
      [0.87, "#E18D80"],
      [0.96, "#5C4266"],
      [1, "#1A2033"]
    ],

    bands: [
      { top: 0.10, bottom: 0.29, step: 36, color: "#30224E", phase: 4 },
      { top: 0.42, bottom: 0.57, step: 28, color: "#594374", phase: 11 },
      { top: 0.66, bottom: 0.73, step: 20, color: "#A36A88", phase: 19 }
    ],

    bandsOpacity: 1,
    overlay: "#091B3130"
  },

  stars: {
    seed: 0x54a3b2c1,
    density: 0.002,
    coverage: 0.9,
    minOpacity: 0.1,
    maxOpacity: 0.44
  },

  moon: {
    position: [0.72, 0.2],
    radius: 64,
    opacity: 0.85,
    color: "#F2DC99",
    haloRadius: 115.2,
    haloOpacity: 0.1,
    haloColor: "#F6DDA2",
    seed: 0x63af18b2
  },

  clouds: {
    seed: 0x6ac14923,
    clusters: 8,
    density: 5,
    opacity: 0.8,
    speed: 2
  },

  lightning: {
    seed: 0x731a4e29,
    initialDelay: 3000,
    interval: [7000, 16000],
    duration: [200, 280],
    strength: [0.6, 1],
    doubleFlashChance: 0.65,
    branches: [0, 3],
    horizontalRange: [0.08, 0.92]
  }
} as const satisfies SkySceneOptions;

export const stormSky = {
  dusk: {
    gradient: [[0, "#131727"], [0.55, "#343A58"], [1, "#101928"]],
    bands: [],
    bandsOpacity: 1,
    overlay: "#091B3130"
  },

  clouds: {
    seed: 0x6ac14923,
    clusters: 14,
    density: 8,
    opacity: 0.92,
    speed: 7
  },

  lightning: {
    seed: 0x731a4e29,
    initialDelay: 1200,
    interval: [2500, 6500],
    duration: [200, 280],
    strength: [0.75, 1],
    doubleFlashChance: 0.65,
    branches: [0, 3],
    horizontalRange: [0.08, 0.92]
  }
} as const satisfies SkySceneOptions;

export const overcastSky = {
  dusk: {
    gradient: [[0, "#232B3B"], [0.58, "#5A6071"], [1, "#333747"]],
    bands: [],
    bandsOpacity: 1,
    overlay: "#091B3130"
  },

  clouds: {
    seed: 0x6ac14923,
    clusters: 16,
    density: 8,
    opacity: 0.9,
    speed: 3
  }
} as const satisfies SkySceneOptions;
