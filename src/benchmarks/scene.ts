import { Camera, Game, RenderCanvas, World } from "#engine/game";
import type { WorldObjects } from "#engine/game";

import { createDemoWorld } from "#game/world";
import { PlatformObject } from "#game/platforms/platform-object";

import { barrel } from "#/sprites/platforms/barrel";
import { hoverDisc } from "#/sprites/platforms/hover-disc";

export const SCENE_VERSION = "demo-stress-v2";
export const SCENE_VIEWPORT = { width: 1280, height: 720 } as const;

export async function createBenchmarkScene() {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, {
    ...SCENE_VIEWPORT,
    backgroundColor: "#080E1F"
  });

  const game = Game.camera(new Camera()).create(canvas);
  const objects: WorldObjects = [...createDemoWorld()];

  // Задаём постоянную нагрузку на отрисовку и дерево динамических коллизий
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 10; column++) {
      objects.push(...World.of([[PlatformObject, {
        show: hoverDisc,
        x: 300 + column * 95,
        y: 280 + row * 45,
        movement: {
          sine: { axis: "x", amplitude: 8, length: 35, period: 3 + row * 0.2 }
        }
      }]]));
    }
  }

  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 15; column++) {
      objects.push(...World.of([[PlatformObject, {
        show: barrel,
        x: 140 + column * 83,
        y: 180 + row * 105
      }]]));
    }
  }

  await game.loadLevel(async () => new World({ objects }));
  await Promise.resolve();

  canvas.emitter.on(canvas.events.beforeRender, ({ now }) => {
    game.camera.x = 2500 + Math.sin(now / 1400) * 1700;
  });

  let measuring = false;
  let renderStart = 0;
  const renderTimes: number[] = [];

  canvas.emitter.on(canvas.events.beforeRender, () => {
    if (measuring) {
      renderStart = performance.now();
    }
  });

  canvas.emitter.on(canvas.events.ui, () => {
    if (measuring) {
      renderTimes.push(performance.now() - renderStart);
    }
  });

  return {
    game,
    version: SCENE_VERSION,
    viewport: SCENE_VIEWPORT,
    objectCount: objects.length,
    beginSample() {
      renderTimes.length = 0;
      measuring = true;
    },
    endSample() {
      measuring = false;
      return renderTimes;
    },
    destroy: () => game.destroy()
  };
}
