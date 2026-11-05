export const roadDebris = {
  seed: 0x7A11C0DE,

  wind: {
    calm: 0.12,
    gust: 1.8,
    initialDelay: [1200, 3000],
    pause: [3000, 7000],
    duration: [1300, 2800],
    strength: [0.9, 1.5],
    turbulence: 18,
    turbulencePeriod: 1300,
    maxDelta: 0.05
  },

  motion: {
    altitude: [95, 170],
    depthScale: [1.15, 0.75],
    hopPeriod: 600,
    hopCalm: 0.4,
    swayPeriod: 800,
    recycleGap: [40, 120],
    rightMargin: 200,
    boundsMargin: 16
  },

  particles: {
    tumbleweed: {
      count: 1,
      speed: [60, 115],
      lift: [3, 8],
      scale: [0.65, 0.85],
      sway: 9,
      opacity: 0.9,
      rollRadius: 0.5
    },

    newspaper: {
      count: 1,
      speed: [95, 95],
      lift: [28, 28],
      scale: [0.65, 0.65],
      sway: 14,
      opacity: 0.8,
      spin: [-0.75, 0.75],
      spinCalm: 0.35,
      tumblePeriod: 500,
      groundOffset: 45,
      minFlipOpacity: 0.5
    }
  }
} as const;

export const stormDebris = {
  ...roadDebris,
  seed: 0x4A9E0231,
  wind: {
    ...roadDebris.wind,
    calm: 0.2,
    gust: 2.4,
    pause: [1500, 4000],
    strength: [1, 1.7]
  },
  particles: {
    tumbleweed: { ...roadDebris.particles.tumbleweed, count: 2 },
    newspaper: roadDebris.particles.newspaper
  }
} as const;
