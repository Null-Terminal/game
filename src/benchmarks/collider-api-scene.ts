import { Camera, Game, RenderCanvas, World } from "#engine/game";
import { ColliderObject, GameObject } from "#engine/game-objects";
import type { BBoxTuple } from "#engine/rtree";

export const COLLIDER_API_VERSION = "collider-switch-v1";

const OBJECT_COUNT = 500;
const FRAME_COUNT = 24;
const QUERY_COUNT = 160;

const boxes: BBoxTuple[] = Array.from({ length: OBJECT_COUNT }, (_, index) => {
  const x = (index * 97) % 4000;
  const y = (index * 131) % 1800;

  return [x, y, x + 24, y + 24];
});

const queries: BBoxTuple[] = Array.from({ length: QUERY_COUNT }, (_, index) => {
  const x = (index * 173) % 4000;
  const y = (index * 211) % 1800;

  return [x, y, x + 32, y + 48];
});

class DynamicBaseline extends GameObject {
  override init() {}
}

class SwitchingCollider extends ColliderObject {
  override init() {
    this.motion.toKinematic();
  }
}

export interface ColliderApiTimes {
  movingCount: number;
  setupBaselineMs: number;
  setupSwitchingMs: number;
  updateBaselineMs: number;
  updateSwitchingMs: number;
  queryBaselineMs: number;
  querySwitchingMs: number;
  checksum: number;
}

export async function compareColliderApis(movingCount: number, reverse = false): Promise<ColliderApiTimes> {
  if (!Number.isInteger(movingCount) || movingCount < 0 || movingCount > OBJECT_COUNT) {
    throw new RangeError("movingCount must be between 0 and 500");
  }

  const baselineGame = createStoppedGame();
  const switchingGame = createStoppedGame();

  try {
    const baselineWorld = await baselineGame.loadLevel(async () => new World({ objects: [] }));
    const switchingWorld = await switchingGame.loadLevel(async () => new World({ objects: [] }));

    baselineGame.canvas.stop();
    switchingGame.canvas.stop();

    let start = performance.now();
    const baseline = boxes.map((bbox) => {
      const pointer = baselineWorld.createObject(DynamicBaseline, { bbox });
      const go = baselineWorld.objects.get(...pointer);

      if (!(go instanceof DynamicBaseline)) {
        throw new Error("Baseline object was not created");
      }

      return go;
    });
    const setupBaselineMs = performance.now() - start;

    start = performance.now();
    const switching = boxes.map((bbox) => {
      const pointer = switchingWorld.createObject(SwitchingCollider, { bbox });
      const go = switchingWorld.objects.get(...pointer);

      if (!(go instanceof SwitchingCollider)) {
        throw new Error("Switching collider was not created");
      }

      return go;
    });
    const setupSwitchingMs = performance.now() - start;

    const movingIds = Array.from({ length: OBJECT_COUNT }, (_, index) => index)
      .filter((index) => (index * 73) % OBJECT_COUNT < movingCount);

    let updateBaselineMs = 0;
    let updateSwitchingMs = 0;
    let queryBaselineMs = 0;
    let querySwitchingMs = 0;
    let checksumBaseline = 0;
    let checksumSwitching = 0;
    let previousOffset = 0;

    const updateBaseline = (shift: number) => {
      const start = performance.now();
      baselineWorld.dynamics.clear();

      for (const index of movingIds) {
        baseline[index]!.move(shift, 0);
      }

      for (const go of baseline) {
        baselineWorld.addToWorld(go, baselineWorld.dynamics);
      }

      updateBaselineMs += performance.now() - start;
    };

    const updateSwitching = (shift: number) => {
      const start = performance.now();
      switchingWorld.dynamics.clear();

      for (const index of movingIds) {
        switching[index]!.move(shift, 0);
      }

      for (const go of switching) {
        go.collision.flush(1 / 60);
      }

      updateSwitchingMs += performance.now() - start;
    };

    for (let frame = 0; frame < FRAME_COUNT; frame++) {
      const offset = frame % 7;
      const shift = offset - previousOffset;
      previousOffset = offset;

      if (reverse) {
        updateSwitching(shift);
        updateBaseline(shift);
      } else {
        updateBaseline(shift);
        updateSwitching(shift);
      }

      start = performance.now();

      for (const query of queries) {
        checksumBaseline += Number(baselineWorld.findBestCollision(...query, () => 0) != null);
      }

      queryBaselineMs += performance.now() - start;
      start = performance.now();

      for (const query of queries) {
        checksumSwitching += Number(switchingWorld.findBestCollision(...query, () => 0) != null);
      }

      querySwitchingMs += performance.now() - start;
    }

    if (checksumBaseline !== checksumSwitching) {
      throw new Error(`Collider indexes disagree: ${checksumBaseline} versus ${checksumSwitching}`);
    }

    return {
      movingCount,
      setupBaselineMs,
      setupSwitchingMs,
      updateBaselineMs,
      updateSwitchingMs,
      queryBaselineMs,
      querySwitchingMs,
      checksum: checksumBaseline
    };

  } finally {
    baselineGame.destroy();
    switchingGame.destroy();
  }
}

function createStoppedGame(): Game {
  const element = document.createElement("canvas");
  const canvas = new RenderCanvas(element, { width: 640, height: 480 });
  canvas.stop();

  return Game.camera(new Camera()).create(canvas);
}
