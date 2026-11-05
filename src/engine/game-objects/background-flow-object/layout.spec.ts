import { describe, expect, it } from "vitest";

import { FlowLayout } from "#engine/game-objects/background-flow-object/layout";

describe("background flow layout", () => {
  it("repeats the same shuffled groups and gaps for a seed", () => {
    const sizes = [100, 120, 80];
    const options = { order: "shuffle", gap: [10, 30], seed: 42 } as const;
    const first = positions(sizes, 1200, options);

    expect(first).toEqual(positions(sizes, 1200, options));
    expect(first).not.toEqual(positions(sizes, 1200, { ...options, seed: 43 }));

    for (let i = 0; i + sizes.length <= first.length; i += sizes.length) {
      expect(first.slice(i, i + sizes.length).map(({ index }) => index).sort()).toEqual([0, 1, 2]);
    }

    for (let i = 1; i < first.length; i++) {
      const previous = first[i - 1]!;
      const gap = first[i]!.position - previous.position - sizes[previous.index]!;
      expect(gap).toBeGreaterThanOrEqual(10);
      expect(gap).toBeLessThanOrEqual(30);
    }
  });

  it("allows random selection to choose the same sprite twice", () => {
    const layout = positions([100, 100], 1000, { order: "random", gap: 20, seed: 42 });

    expect(layout.some(({ index }, position) => position > 0 && index === layout[position - 1]!.index)).toBe(true);
  });

  it("keeps round-robin order when the layout extends in steps", () => {
    const sizes = [100, 120, 80];
    const options = { order: "round-robin", gap: [10, 30], seed: 42 } as const;
    const layout = new FlowLayout(sizes, options);

    layout.extendTo(400);
    const prefix = layout.positions.slice();
    layout.extendTo(1200);

    expect(layout.positions.slice(0, prefix.length)).toEqual(prefix);
    expect(layout.positions).toEqual(positions(sizes, 1200, options));
    expect(layout.positions.every(({ index }, position) => index === position % sizes.length)).toBe(true);
  });

  it("covers the requested distance even with overlapping sprites", () => {
    const layout = positions([100], 450, { gap: -1, seed: 1 });

    expect(layout[0]?.position).toBe(0);
    expect(layout.at(-1)!.position + 100).toBeGreaterThanOrEqual(450);
  });
});

type LayoutOptions = ConstructorParameters<typeof FlowLayout>[1];

function positions(sizes: readonly number[], end: number, options: LayoutOptions) {
  const layout = new FlowLayout(sizes, options);
  layout.extendTo(end);
  return layout.positions;
}
