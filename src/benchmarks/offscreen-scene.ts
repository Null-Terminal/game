import { Camera, Game, RenderCanvas, World } from "#engine/game";
import { ColliderObject, GameObject } from "#engine/game-objects";

import { sampleFrameIntervals } from "#/benchmarks/frame-sample";

export const OFFSCREEN_SCENE_VERSION = "dynamic-movers-v6";

export type OffscreenMode = "active" | "paused" | "sleep" | "culled" | "absent";
export type OffscreenObjectKind = "plain" | "collider";
export type OffscreenLayout = "far" | "spread";

const SAMPLE_SECONDS = 4;
const SPREAD_SCREENS = 20;
const TRAVEL_SCREENS = 10;

class BenchmarkTarget extends GameObject {
  override init() {
    this.width = 10;
    this.height = 10;
  }
}

class BenchmarkDynamicObject extends GameObject {
  init() {}

  override get redrawEvent() {
    return this.canvas.events.scene;
  }

  protected override bindFlush() {
    this.world.addToWorld(this, this.world.dynamics);
  }
}

class BenchmarkColliderObject extends ColliderObject {
  override init() {
    this.motion.toKinematic();
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
  count: number,
  kind: OffscreenObjectKind = "plain",
  layout: OffscreenLayout = "far"
) {
  if (kind === "collider" && mode === "culled") {
    throw new RangeError("The culled mode only supports plain objects");
  }

  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { ...viewport, backgroundColor: "#080E1F" });

  let measuring = false;
  let renderStart = 0;
  let sampleStart = 0;
  let target: BenchmarkTarget | null = null;
  const renderTimes: number[] = [];

  canvas.emitter.on(canvas.events.beforeRender, ({ now }) => {
    if (measuring) {
      renderStart = performance.now();

      if (layout === "spread" && target != null) {
        const progress = Math.min(1, (now - sampleStart) / (SAMPLE_SECONDS * 1000));
        const x = progress * TRAVEL_SCREENS * viewport.width;
        target.move(x - target.x, 0);
        game.camera.x = target.x;
      }
    }
  });

  canvas.emitter.on(canvas.events.ui, () => {
    if (measuring) {
      renderTimes.push(performance.now() - renderStart);
    }
  });

  const game = Game.camera(new Camera()).create(canvas, mode === "sleep" ? {
    sleep: { distanceScreens: 2 }
  } : {});
  const world = await game.loadLevel(async () => new World({ objects: [] }));
  const objects: GameObject[] = [];

  if (mode === "sleep" || layout === "spread") {
    const created = world.objects.get(...world.createObject(BenchmarkTarget, { x: 0, y: 0 }));

    if (!(created instanceof BenchmarkTarget)) {
      throw new Error("Offscreen benchmark target was not created");
    }

    target = created;
  }

  if (mode !== "absent") {
    for (let index = 0; index < count; index++) {
      const x = layout === "spread" ?
        viewport.width * SPREAD_SCREENS * index / count :
        100_000 + index * 40;
      const objectClass = mode === "culled" ? CulledDynamicObject :
        kind === "collider" ? BenchmarkColliderObject : BenchmarkDynamicObject;
      const pointer = world.createObject(objectClass, {
        bbox: [x, 0, x + 20, 20],
        movement: {
          sine: { axis: "x", amplitude: 5, length: 30, period: 3 }
        }
      });
      const object = world.objects.get(...pointer)!;
      objects.push(object);

      if (mode === "paused") {
        object.status.pause();
      }
    }
  }

  return {
    version: `${OFFSCREEN_SCENE_VERSION}:${kind}:${layout}`,
    objectCount: mode === "absent" ? 0 : count,
    async runSample() {
      renderTimes.length = 0;
      sampleStart = performance.now();

      if (target != null && layout === "spread") {
        target.move(-target.x, 0);
        game.camera.x = target.x;
        game.sleep.update();
      }

      measuring = true;
      const frameTimes = await sampleFrameIntervals(SAMPLE_SECONDS);
      measuring = false;

      const awakeCount = objects.reduce((total, object) => total + Number(!object.status.sleeping), 0);
      return { frameTimes, renderTimes: [...renderTimes], awakeCount, targetX: target?.x ?? null };
    },
    destroy: () => game.destroy()
  };
}
