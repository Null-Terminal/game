import { RTree } from "#engine/rtree";

import type { BBoxTuple } from "#engine/rtree";

export const COLLISION_INDEX_VERSION = "stationary-dynamic-v2";

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

export interface CollisionIndexTimes {
  movingCount: number;
  swapsPerFrame: number;
  staticSetupMs: number;
  transitionMs: number;
  rebuildAllMs: number;
  queryAllMs: number;
  rebuildSplitMs: number;
  querySplitMs: number;
  checksum: number;
}

export function compareCollisionIndexes(movingCount: number, swapsPerFrame = 0): CollisionIndexTimes {
  const all = new RTree();
  const stationary = new RTree();
  const moving = new RTree();
  const movingFlags = Array.from({ length: OBJECT_COUNT }, (_, index) =>
    (index * 73) % OBJECT_COUNT < movingCount);
  const xOffsets = Array<number>(OBJECT_COUNT).fill(0);
  const movingIds = movingFlags.flatMap((moving, index) => moving ? [index] : []);
  const stationaryIds = movingFlags.flatMap((moving, index) => moving ? [] : [index]);

  let checksumAll = 0;
  let checksumSplit = 0;
  let rebuildAllMs = 0;
  let queryAllMs = 0;
  let rebuildSplitMs = 0;
  let querySplitMs = 0;
  let transitionMs = 0;

  const setupStart = performance.now();

  for (let index = 0; index < OBJECT_COUNT; index++) {
    if (!movingFlags[index]) {
      stationary.insert(1, index, ...boxes[index]!);
    }
  }

  const staticSetupMs = performance.now() - setupStart;

  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    const offset = frame % 7;
    let start = performance.now();

    for (let index = 0; index < swapsPerFrame; index++) {
      const movingId = movingIds[index]!;
      const stationaryId = stationaryIds[index]!;
      const oldMovingId = movingFlags[movingId] ? movingId : stationaryId;
      const oldStationaryId = movingFlags[movingId] ? stationaryId : movingId;
      const [sx1, sy1, sx2, sy2] = boxes[oldStationaryId]!;
      const [mx1, my1, mx2, my2] = boxes[oldMovingId]!;

      if (!stationary.remove(1, oldStationaryId, sx1 + xOffsets[oldStationaryId]!, sy1,
        sx2 + xOffsets[oldStationaryId]!, sy2)) {
        throw new Error("Stationary collision was not removed");
      }

      stationary.insert(1, oldMovingId, mx1 + xOffsets[oldMovingId]!, my1,
        mx2 + xOffsets[oldMovingId]!, my2);

      movingFlags[oldMovingId] = false;
      movingFlags[oldStationaryId] = true;
    }

    transitionMs += performance.now() - start;

    for (let index = 0; index < OBJECT_COUNT; index++) {
      if (movingFlags[index]) {
        xOffsets[index] = offset;
      }
    }

    start = performance.now();

    all.clear();

    for (let index = 0; index < OBJECT_COUNT; index++) {
      const [x1, y1, x2, y2] = boxes[index]!;
      const dx = xOffsets[index]!;
      all.insert(1, index, x1 + dx, y1, x2 + dx, y2);
    }

    rebuildAllMs += performance.now() - start;
    start = performance.now();

    for (const query of queries) {
      checksumAll += Number(all.searchFirst(...query) != null);
    }

    queryAllMs += performance.now() - start;
    start = performance.now();

    moving.clear();

    for (let index = 0; index < OBJECT_COUNT; index++) {
      if (movingFlags[index]) {
        const [x1, y1, x2, y2] = boxes[index]!;
        moving.insert(1, index, x1 + xOffsets[index]!, y1, x2 + xOffsets[index]!, y2);
      }
    }

    rebuildSplitMs += performance.now() - start;
    start = performance.now();

    for (const query of queries) {
      checksumSplit += Number(
        moving.searchFirst(...query) != null || stationary.searchFirst(...query) != null
      );
    }

    querySplitMs += performance.now() - start;
  }

  if (checksumAll !== checksumSplit) {
    throw new Error(`Collision indexes disagree: ${checksumAll} versus ${checksumSplit}`);
  }

  return {
    movingCount,
    swapsPerFrame,
    staticSetupMs,
    transitionMs,
    rebuildAllMs,
    queryAllMs,
    rebuildSplitMs,
    querySplitMs,
    checksum: checksumAll
  };
}
