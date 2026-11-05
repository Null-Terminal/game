import { describe, expect, it } from "vitest";

import { BBox } from "#engine/rtree/bbox";
import { createRTreeView } from "#engine/rtree/test-utils";

describe("BBox", () => {
  it("stores bounds in the shared binary buffer and includes a touching edge", () => {
    const bbox = new BBox(createRTreeView());
    bbox.set(16, -10, 5, 20, 25);

    expect(bbox.get(16)).toEqual([-10, 5, 20, 25]);
    expect(bbox.calcArea(16)).toBe(600);
    expect(bbox.hasIntersection(16, 20, 10, 30, 15)).toBe(true);
    expect(bbox.hasIntersection(16, 21, 10, 30, 15)).toBe(false);
  });

  it("treats an all-zero bounding box as an empty node", () => {
    const bbox = new BBox(createRTreeView());

    expect(bbox.isNull(16)).toBe(true);
    expect(bbox.hasIntersection(16, -1, -1, 1, 1)).toBe(false);

    bbox.set(16, 0, 0, 0, 1);
    expect(bbox.isNull(16)).toBe(false);
  });
});
