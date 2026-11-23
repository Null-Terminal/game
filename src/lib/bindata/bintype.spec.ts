import { describe, expect, expectTypeOf, it } from "vitest";

import { alias, bintype, f32, u16 } from "#/bindata";

describe("binary types", () => {
  it("keeps the storage type when assigning a field name", () => {
    const distance = alias("distance", f32);

    expect(distance).toEqual({ name: "f32", alias: "distance", size: 4 });

    expectTypeOf(distance.name).toEqualTypeOf<"f32">();
    expectTypeOf(distance.alias).toEqualTypeOf<"distance">();
    expectTypeOf(distance.size).toEqualTypeOf<4>();
  });

  it("preserves the declared name and byte size as literal types", () => {
    const index = bintype("index", 2);

    expect(index).toEqual({ name: "index", alias: "index", size: u16.size });

    expectTypeOf(index.name).toEqualTypeOf<"index">();
    expectTypeOf(index.size).toEqualTypeOf<2>();
  });
});
