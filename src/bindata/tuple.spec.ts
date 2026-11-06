import { describe, expect, expectTypeOf, it } from "vitest";

import { alias, f32, tuple, u8, u16 } from "#/bindata";

describe("binary tuples", () => {
  it("assigns named fields and offsets in bytes and typed-array units", () => {
    const layout = tuple("sample", [
      alias("first", u16),
      alias("second", u16),
      alias("value", f32),
      alias("flag", u8)
    ]);

    expect(layout.size).toBe(9);
    expect(layout.at.value).toMatchObject({ name: "f32", alias: "value", index: 2 });
    expect(layout.at[3]).toMatchObject({ name: "u8", alias: "flag", index: 3 });

    expect(layout.offsets8.value).toBe(4);
    expect(layout.offsets16.value).toBe(2);
    expect(layout.offsets32.value).toBe(1);
    expect(layout.offsets8.flag).toBe(8);

    expectTypeOf(layout.size).toEqualTypeOf<9>();
    expectTypeOf(layout.at.value.name).toEqualTypeOf<"f32">();
    expectTypeOf(layout.at.value.alias).toEqualTypeOf<"value">();
    expectTypeOf(layout.at[3].name).toEqualTypeOf<"u8">();
  });

  it("uses the byte offsets to read the same values from a buffer", () => {
    const layout = tuple("record", [alias("id", u16), alias("amount", f32)]);
    const view = new DataView(new ArrayBuffer(layout.size));

    view.setUint16(layout.offsets8.id, 513, true);
    view.setFloat32(layout.offsets8.amount, 1.5, true);

    expect(view.getUint16(layout.offsets8.id, true)).toBe(513);
    expect(view.getFloat32(layout.offsets8.amount, true)).toBe(1.5);
    expect(layout.offsets16.amount).toBe(1);
  });
});
