import { describe, expect, it } from "vitest";

import { RTreeNode } from "#engine/rtree/node";
import { createRTreeView } from "#engine/rtree/test-utils";

describe("RTreeNode", () => {
  it("maintains child ownership when removing a child", () => {
    const nodes = new RTreeNode(createRTreeView());
    const parent = 16;
    const first = 32;
    const second = 48;

    nodes.createEmpty(parent, 1);
    nodes.createEmpty(first);
    nodes.createEmpty(second);
    nodes.pushChild(parent, first);
    nodes.pushChild(parent, second);

    expect(nodes.isLeaf(parent)).toBe(false);
    expect(nodes.getParent(first)).toBe(parent);
    expect(nodes.getParent(second)).toBe(parent);
    expect(nodes.getSize(parent)).toBe(2);

    expect(nodes.removeChild(parent, first)).toBe(true);
    expect(nodes.getSize(parent)).toBe(1);
    expect(nodes.getChild(parent, 0)).toBe(second);
    expect(nodes.removeChild(parent, first)).toBe(false);
  });
});
