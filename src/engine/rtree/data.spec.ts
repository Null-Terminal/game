import { describe, expect, it } from "vitest";

import { Data } from "#engine/rtree/data";
import { createRTreeView } from "#engine/rtree/test-utils";

describe("Data", () => {
  it("stores an object's kind and index together", () => {
    const data = new Data(createRTreeView());
    data.set(16, 3, 42);

    expect(data.get(16)).toEqual([3, 42]);
  });
});
