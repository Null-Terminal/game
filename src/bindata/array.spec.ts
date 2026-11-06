import { describe, expect, expectTypeOf, it } from "vitest";

import { alias, array, tuple, u16 } from "#/bindata";

describe("binary arrays", () => {
  it("multiplies element size by count at runtime and in the type", () => {
    const entries = array("entries", u16, 3);

    expect(entries).toMatchObject({
      name: "entries",
      alias: "entries",
      length: 3,
      size: 6
    });

    expectTypeOf(entries.length).toEqualTypeOf<3>();
    expectTypeOf(entries.size).toEqualTypeOf<6>();
  });

  it("keeps nested layout sizes consistent with their fields", () => {
    const point = tuple("point", [alias("x", u16), alias("y", u16)]);
    const points = array("points", point, 3);
    const packet = tuple("packet", [alias("count", u16), points]);

    expect(point.size).toBe(4);
    expect(points.size).toBe(12);
    expect(packet.size).toBe(14);
    expect(packet.offsets8.points).toBe(2);

    expectTypeOf(point.size).toEqualTypeOf<4>();
    expectTypeOf(points.size).toEqualTypeOf<12>();
    expectTypeOf(packet.size).toEqualTypeOf<14>();
    expectTypeOf(packet.at.points.name).toEqualTypeOf<"points">();
  });
});
