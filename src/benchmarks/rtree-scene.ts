import { RTree } from "#engine/rtree";
import type { BBoxTuple, RTreePublicNode } from "#engine/rtree";

export const RTREE_VERSION = "grid-4000-queries-20000-x4-v2";

const ENTRY_COUNT = 4000;
const QUERY_COUNT = 20000;

const entries: BBoxTuple[] = Array.from({ length: ENTRY_COUNT }, (_, index) => {
  const x = (index * 73) % 4000;
  const y = (index * 127) % 2000;

  return [x, y, x + 24, y + 24];
});

const queries: BBoxTuple[] = Array.from({ length: QUERY_COUNT }, (_, index) => {
  const x = (index * 97) % 4000;
  const y = (index * 193) % 2000;

  return [x, y, x + 32, y + 32];
});

const score = (node: RTreePublicNode) => node.pointer[1];

export interface RTreeTimes {
  insertMs: number;
  searchFirstMs: number;
  searchBestMs: number;
  removeMs: number;
  checksum: number;
}

export function runRTreeBatch(): RTreeTimes {
  const tree = new RTree();
  let checksum = 0;

  const start = performance.now();

  for (let index = 0; index < entries.length; index++) {
    tree.insert(1, index, ...entries[index]!);
  }

  const inserted = performance.now();

  for (const bounds of queries) {
    checksum += tree.searchFirst(...bounds)?.pointer[1] ?? 0;
  }

  const searchedFirst = performance.now();

  for (const bounds of queries) {
    checksum += tree.searchBest(...bounds, score)?.pointer[1] ?? 0;
  }

  const searchedBest = performance.now();

  for (let index = 0; index < entries.length; index += 4) {
    if (tree.remove(1, index, ...entries[index]!)) {
      checksum++;
    }
  }

  const removed = performance.now();

  return {
    insertMs: inserted - start,
    searchFirstMs: searchedFirst - inserted,
    searchBestMs: searchedBest - searchedFirst,
    removeMs: removed - searchedBest,
    checksum
  };
}

export function runRTreeGroup(): RTreeTimes {
  const totals: RTreeTimes = {
    insertMs: 0,
    searchFirstMs: 0,
    searchBestMs: 0,
    removeMs: 0,
    checksum: 0
  };

  for (let index = 0; index < 4; index++) {
    const batch = runRTreeBatch();

    totals.insertMs += batch.insertMs;
    totals.searchFirstMs += batch.searchFirstMs;
    totals.searchBestMs += batch.searchBestMs;
    totals.removeMs += batch.removeMs;
    totals.checksum += batch.checksum;
  }

  return totals;
}
