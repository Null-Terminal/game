import { Camera, Game, RenderCanvas, World } from "#engine/game";
import { GameObject } from "#engine/game-objects";

import { sampleFrameIntervals } from "#/benchmarks/frame-sample";

export const OFFSCREEN_SCENE_VERSION = "dynamic-movers-v1";

export type OffscreenMode = "active" | "paused" | "shadowed" | "culled" | "absent";

class BenchmarkDynamicObject extends GameObject {
  init() {}

  override get redrawEvent() {
    return this.canvas.events.scene;
  }

  protected override bindFlush() {
    this.world.addToWorld(this, this.world.dynamics);
  }
}

class CulledDynamicObject extends BenchmarkDynamicObject {
  protected override bindFlush() {
    const { x, y } = this.game.camera;
    const { width, height } = this.canvas;
    const margin = 200;

    if (
      this.x + this.width < x - margin || this.x > x + width + margin ||
      this.y + this.height < y - margin || this.y > y + height + margin
    ) {
      return;
    }

    super.bindFlush();
  }
}

export async function createOffscreenScene(
  viewport: { width: number; height: number },
  mode: OffscreenMode,
  count: number
) {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { ...viewport, backgroundColor: "#080E1F" });
  const game = Game.camera(new Camera()).create(canvas);
  const world = await game.loadLevel(async () => new World({ objects: [] }));

  if (mode !== "absent") {
    for (let index = 0; index < count; index++) {
      const x = 100_000 + index * 40;
      const objectClass = mode === "culled" ? CulledDynamicObject : BenchmarkDynamicObject;
      const pointer = world.createObject(objectClass, {
        bbox: [x, 0, x + 20, 20],
        movement: {
          sine: { axis: "x", amplitude: 5, length: 30, period: 3 }
        }
      });
      const object = world.objects.get(...pointer)!;

      if (mode === "paused") {
        object.status.pause();

      } else if (mode === "shadowed") {
        object.status.shadow();
      }
    }
  }

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
    version: OFFSCREEN_SCENE_VERSION,
    objectCount: mode === "absent" ? 0 : count,
    async runSample() {
      renderTimes.length = 0;
      measuring = true;
      const frameTimes = await sampleFrameIntervals(4);
      measuring = false;

      return { frameTimes, renderTimes: [...renderTimes] };
    },
    destroy: () => game.destroy()
  };
}
