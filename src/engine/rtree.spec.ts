import { describe, expect, it } from "vitest";

import { RTree, type BBoxTuple } from "#engine/rtree";

describe("RTree", () => {
  it("finds entries whose bounds intersect the query, including a shared edge", () => {
    const tree = new RTree();
    tree.insert(1, 10, 10, 20, 30, 40);
    tree.insert(1, 20, 50, 20, 70, 40);

    expect(indices(tree, [30, 25, 50, 35])).toEqual([10, 20]);
    expect(indices(tree, [31, 25, 49, 35])).toEqual([]);
    expect(indices(tree, [50, 35, 30, 25])).toEqual([10, 20]);
  });

  it("filters results and can stop at the first accepted entry", () => {
    const tree = new RTree();
    tree.insert(1, 10, 10, 10, 20, 20);
    tree.insert(2, 20, 10, 10, 20, 20);

    const onlyKindTwo = ({ pointer }: { pointer: readonly [number, number] }) => pointer[0] === 2;

    expect(tree.search(0, 0, 30, 30, onlyKindTwo).map(({ pointer }) => pointer[1])).toEqual([20]);
    expect(tree.searchFirst(0, 0, 30, 30, onlyKindTwo)?.pointer).toEqual([2, 20]);
    expect(tree.searchFirst(30, 30, 40, 40)).toBeNull();
  });

  it("selects the lowest score and ignores candidates scored Infinity", () => {
    const tree = new RTree();
    tree.insert(1, 10, 10, 10, 20, 20);
    tree.insert(1, 20, 10, 10, 20, 20);
    tree.insert(1, 30, 10, 10, 20, 20);

    const score = ({ pointer }: { pointer: readonly [number, number] }) =>
      pointer[1] === 20 ? 0 : pointer[1] === 10 ? 5 : Infinity;

    expect(tree.searchBest(0, 0, 30, 30, score)?.pointer[1]).toBe(20);
    expect(tree.searchBest(0, 0, 30, 30, () => Infinity)).toBeNull();
    expect(tree.searchBest(100, 100, 110, 110, score)).toBeNull();
  });

  it("keeps an outer search intact when its score starts another search", () => {
    const tree = new RTree();
    tree.insert(1, 10, 10, 10, 20, 20);
    tree.insert(1, 20, 10, 10, 20, 20);

    const result = tree.searchBest(0, 0, 30, 30, ({ pointer }) => {
      expect(tree.searchBest(0, 0, 30, 30, ({ pointer: nested }) => nested[1])?.pointer[1]).toBe(10);
      return -pointer[1];
    });

    expect(result?.pointer[1]).toBe(20);
    expect(tree.searchBest(0, 0, 30, 30, ({ pointer }) => pointer[1])?.pointer[1]).toBe(10);
  });

  it("preserves query results after splitting nodes and removing entries", () => {
    const tree = new RTree(4);

    type Entry = { index: number; bbox: BBoxTuple };

    const entries: Entry[] = Array.from({ length: 48 }, (_, index) => {
      const x = (index % 8) * 40 + 10;
      const y = Math.floor(index / 8) * 40 + 10;
      return { index, bbox: [x, y, x + 12, y + 12] };
    });

    for (const { index, bbox } of entries) {
      tree.insert(1, index, ...bbox);
    }

    expect(tree.size).toBeGreaterThan(entries.length);

    const queries: BBoxTuple[] = [
      [0, 0, 400, 400], [11, 11, 11, 11], [45, 45, 170, 130],
      [200, 0, 290, 250], [500, 500, 600, 600]
    ];

    for (const { index, bbox } of entries.filter(({ index }) => index % 3 === 0)) {
      expect(tree.remove(1, index, ...bbox)).toBe(true);
    }

    const remaining = entries.filter(({ index }) => index % 3 !== 0);

    for (const query of queries) {
      const expected = remaining.filter(({ bbox }) => intersects(bbox, query)).map(({ index }) => index);
      expect(indices(tree, query)).toEqual(expected.sort((a, b) => a - b));
    }
  });

  it("reindexes an exact entry without changing its bounds or other entries", () => {
    const tree = new RTree();
    tree.insert(1, 10, 10, 10, 20, 20);
    tree.insert(2, 10, 10, 10, 20, 20);

    expect(tree.reindex(1, 10, 10, 10, 20, 20, 30)).toBe(true);
    expect(tree.reindex(1, 10, 10, 10, 20, 20, 40)).toBe(false);
    expect(tree.search(0, 0, 30, 30).map(({ pointer }) => pointer).sort()).toEqual([[1, 30], [2, 10]]);
    expect(tree.remove(1, 10, 10, 10, 20, 20)).toBe(false);
    expect(tree.remove(1, 30, 10, 10, 20, 20)).toBe(true);
  });

  it("clears all entries and accepts new ones", () => {
    const tree = new RTree();
    tree.insert(1, 10, 10, 10, 20, 20);
    tree.clear();

    expect(indices(tree, [0, 0, 30, 30])).toEqual([]);
    tree.insert(1, 20, 40, 40, 50, 50);
    expect(indices(tree, [0, 0, 60, 60])).toEqual([20]);
  });

  it("can restore an index from its shared binary buffer", () => {
    const buffer = new ArrayBuffer(RTree.BYTES_PER_ELEMENT * 128);
    const original = new RTree(4, buffer);

    original.insert(3, 10, 10, 10, 20, 20);
    original.insert(3, 20, 40, 40, 50, 50);

    const restored = new RTree(4, buffer);

    expect(indices(restored, [0, 0, 60, 60])).toEqual([10, 20]);
    expect(restored.remove(3, 10, 10, 10, 20, 20)).toBe(true);
    expect(indices(restored, [0, 0, 60, 60])).toEqual([20]);
  });
});

function indices(tree: RTree, bbox: BBoxTuple): number[] {
  return tree.search(...bbox).map(({ pointer }) => pointer[1]).sort((a, b) => a - b);
}

function intersects(a: BBoxTuple, b: BBoxTuple): boolean {
  return a[2] >= b[0] && a[0] <= b[2] && a[3] >= b[1] && a[1] <= b[3];
}
