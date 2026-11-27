import { describe, expect, it } from "vitest";

import { SeededRandom } from "#/utils/seeded-random";

describe("SeededRandom", () => {
  it("replays the same sequence after reset", () => {
    const random = new SeededRandom(42);
    const first = [random.next(), random.next(), random.next()];

    random.reset(42);

    expect([random.next(), random.next(), random.next()]).toEqual(first);
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it("offers the same sequence through its iterator", () => {
    const direct = new SeededRandom(7);
    const iterable = new SeededRandom(7);
    const values = iterable[Symbol.iterator]();

    expect([values.next().value, values.next().value]).toEqual([direct.next(), direct.next()]);
  });
});
