import { Camera, Game, RenderCanvas, World, type WorldObjects } from "#engine/game";
import { BackgroundObject } from "#engine/game-objects";

import { scaffoldFrame } from "#/sprites/platforms/scaffold-frame";

import { sampleFrameIntervals } from "#/benchmarks/frame-sample";

export const OBJECT_COUNT_SCENE_VERSION = "scaffold-20x5-v1";

const COLUMNS = 20;
const ROWS = 5;
const LEFT = 200;
const BOTTOM = 200;
const SAMPLE_SECONDS = 4;

export async function createObjectCountScene(
  viewport: { width: number; height: number },
  layout: "objects" | "baked",
  backend: "2d" | "webgl"
) {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, {
    ...viewport,
    backgroundColor: "#080E1F",
    backend
  });

  const game = Game.camera(new Camera()).create(canvas);
  const objects: WorldObjects = [];
  const { maxWidth: cellWidth, maxHeight: cellHeight } = scaffoldFrame;

  if (layout === "objects") {
    for (let row = 0; row < ROWS; row++) {
      for (let column = 0; column < COLUMNS; column++) {
        objects.push([BackgroundObject, {
          show: scaffoldFrame,
          x: LEFT + column * cellWidth,
          y: BOTTOM + row * cellHeight
        }]);
      }
    }

  } else {
    objects.push([BackgroundObject, {
      show: scaffoldFrame,
      bbox: [LEFT, BOTTOM, LEFT + COLUMNS * cellWidth, BOTTOM + ROWS * cellHeight]
    }]);
  }

  await game.loadLevel(async () => new World({ objects }));
  await Promise.resolve();

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
    version: OBJECT_COUNT_SCENE_VERSION,
    objectCount: objects.length,
    async runSample() {
      renderTimes.length = 0;
      measuring = true;

      const frameTimes = await sampleFrameIntervals(SAMPLE_SECONDS);

      measuring = false;

      return {
        frameTimes,
        renderTimes: [...renderTimes],
        textureStats: canvas.textureStats
      };
    },
    destroy: () => game.destroy()
  };
}
