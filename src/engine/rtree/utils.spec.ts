import { describe, expect, it } from "vitest";

import { calcBBoxArea, nanToInfinity } from "#engine/rtree/utils";

describe("R-tree geometry", () => {
  it("normalizes undefined area from infinite bounds", () => {
    expect(calcBBoxArea(0, 0, 10, 5)).toBe(50);
    expect(calcBBoxArea(-Infinity, 0, Infinity, 5)).toBe(Infinity);
    expect(nanToInfinity(Infinity - Infinity)).toBe(Infinity);
  });
});
