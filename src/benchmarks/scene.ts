import { Camera, Game, RenderCanvas, World } from "#engine/game";
import type { WorldObjects } from "#engine/game";

import { createDemoWorld } from "#game/world";
import { PersonObject } from "#game/person-object";
import { PlatformObject } from "#game/platforms/platform-object";

import { barrel } from "#/sprites/platforms/barrel";
import { hoverDisc } from "#/sprites/platforms/hover-disc";

export const SCENE_VERSION = "demo-stress-v3";
export const SCENE_VIEWPORT = { width: 1280, height: 720 } as const;

const SCAN_DURATION = 4;

// Дорога до правого края, затем средние и верхние ярусы лесов
const cameraRoute = [
  { time: 0, x: 0, y: 0 },
  { time: 2, x: 6000, y: 0 },
  { time: 2.4, x: 4300, y: 400 },
  { time: 3.2, x: 2400, y: 400 },
  { time: 3.4, x: 2400, y: 900 },
  { time: SCAN_DURATION, x: 4300, y: 900 }
] as const;

interface ScanCoverage {
  roadEnd: boolean;
  middleLeft: boolean;
  middleRight: boolean;
  upperLeft: boolean;
  upperRight: boolean;
}

export async function createBenchmarkScene() {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, {
    ...SCENE_VIEWPORT,
    backgroundColor: "#080E1F"
  });

  const game = Game.camera(new Camera({
    smoothness: 1,
    deadZone: {
      left: SCENE_VIEWPORT.width / 2,
      right: SCENE_VIEWPORT.width / 2,
      top: SCENE_VIEWPORT.height / 2,
      bottom: SCENE_VIEWPORT.height / 2
    }
  })).create(canvas);
  const objects: WorldObjects = [...createDemoWorld()];

  // Добавляем плотный участок платформ в начале маршрута
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

  const world = await game.loadLevel(async () => new World({ objects }));
  await Promise.resolve();

  const pointer = world.createObject(PersonObject, { x: 0, y: 0 });
  const created = world.objects.get(...pointer);

  if (!(created instanceof PersonObject)) {
    throw new Error("Benchmark scene: player was not created");
  }

  const player = created;
  player.motion.toKinematic();
  player.updateStats(() => ({ gravity: 0, speed: 0, vx: 0, vy: 0 }));

  let measuring = false;
  let renderStart = 0;
  let scanElapsed = 0;

  const renderTimes: number[] = [];
  const coverage: ScanCoverage = {
    roadEnd: false,
    middleLeft: false,
    middleRight: false,
    upperLeft: false,
    upperRight: false
  };

  canvas.emitter.on(canvas.events.beforeRender, () => {
    if (measuring) {
      renderStart = performance.now();
    }
  });

  canvas.emitter.on(canvas.events.ui, () => {
    if (measuring) {
      renderTimes.push(performance.now() - renderStart);

      const { x, y } = game.camera;
      coverage.roadEnd ||= x > 5700 && y < 50;
      coverage.middleLeft ||= x < 2600 && y > 350 && y < 500;
      coverage.middleRight ||= x > 4100 && y > 350 && y < 500;
      coverage.upperLeft ||= x < 2600 && y > 850;
      coverage.upperRight ||= x > 4100 && y > 850;
    }
  });

  function startScan() {
    const centerX = SCENE_VIEWPORT.width / 2 - player.width / 2;
    const centerY = SCENE_VIEWPORT.height / 2 - player.height / 2;

    player.move(centerX - player.x, centerY - player.y);
    game.camera.update();

    scanElapsed = 0;

    player.movement.follow({
      at: (elapsed) => {
        scanElapsed = elapsed;
        const [x, y] = cameraAt(elapsed);
        return [centerX + x, centerY + y];
      }
    });
  }

  return {
    game,
    version: SCENE_VERSION,
    viewport: SCENE_VIEWPORT,
    objectCount: objects.length + 1,
    async runScan() {
      renderTimes.length = 0;
      coverage.roadEnd = false;
      coverage.middleLeft = false;
      coverage.middleRight = false;
      coverage.upperLeft = false;
      coverage.upperRight = false;

      startScan();
      measuring = true;

      const frameTimes = await new Promise<number[]>((resolve) => {
        const times: number[] = [];
        let previous = 0;

        function sample(now: number) {
          if (previous !== 0) {
            times.push(now - previous);
          }

          previous = now;

          if (scanElapsed < SCAN_DURATION) {
            requestAnimationFrame(sample);

          } else {
            resolve(times);
          }
        }

        requestAnimationFrame(sample);
      });

      measuring = false;

      return {
        frameTimes,
        renderTimes: [...renderTimes],
        coverage: { ...coverage }
      };
    },
    destroy: () => game.destroy()
  };
}

function cameraAt(elapsed: number): readonly [x: number, y: number] {
  for (let index = 1; index < cameraRoute.length; index++) {
    const end = cameraRoute[index]!;

    if (elapsed <= end.time) {
      const start = cameraRoute[index - 1]!;
      const progress = (elapsed - start.time) / (end.time - start.time);

      return [
        start.x + (end.x - start.x) * progress,
        start.y + (end.y - start.y) * progress
      ];
    }
  }

  const end = cameraRoute.at(-1)!;
  return [end.x, end.y];
}
