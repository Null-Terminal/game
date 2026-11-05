import { describe, expect, it } from "vitest";

import { removeTargetColor } from "#engine/animation/remove-background";

describe("sprite chroma key", () => {
  it("requires an RGB or RGBA key", () => {
    const pixels = Uint8ClampedArray.of(0, 255, 0, 255);

    expect(() => removeTargetColor([0, 255], pixels, 1, 1, 5)).toThrow(/RGB.*RGBA/);
    expect(() => removeTargetColor([0, 255, 0, 255, 0], pixels, 1, 1, 5)).toThrow(/RGB.*RGBA/);
  });

  it("removes dark green remnants while preserving colored foreground", () => {
    const pixels = Uint8ClampedArray.from([
      0, 255, 0, 255,
      5, 160, 20, 255,
      40, 50, 90, 255,
      10, 100, 20, 255
    ]);

    removeTargetColor([0, 255, 0], pixels, 4, 1, 30);

    expect([pixels[3], pixels[7], pixels[11], pixels[15]]).toEqual([0, 0, 255, 0]);
  });

  it("preserves cyan and amber details near a green key", () => {
    const pixels = Uint8ClampedArray.from([
      0, 255, 0, 255,
      10, 170, 210, 255,
      220, 150, 30, 255
    ]);

    removeTargetColor([0, 255, 0], pixels, 3, 1, 30);

    expect([pixels[3], pixels[7], pixels[11]]).toEqual([0, 255, 255]);
  });

  it("keeps neutral colors outside the tolerance", () => {
    const pixels = Uint8ClampedArray.from([
      8, 8, 8, 255,
      40, 50, 90, 255
    ]);

    removeTargetColor([0, 0, 0], pixels, 2, 1, 10);

    expect([pixels[3], pixels[7]]).toEqual([0, 255]);
  });

  it("removes dark shades of red, blue, and yellow keys", () => {
    const samples = [
      { key: [255, 0, 0], shade: [140, 8, 12], foreground: [30, 110, 120] },
      { key: [0, 0, 255], shade: [8, 12, 140], foreground: [120, 110, 30] },
      { key: [255, 255, 0], shade: [140, 130, 8], foreground: [140, 30, 8] }
    ];

    for (const { key, shade, foreground } of samples) {
      const pixels = Uint8ClampedArray.from([...key, 255, ...shade, 255, ...foreground, 255]);
      removeTargetColor(key, pixels, 3, 1, 20);
      expect([pixels[3], pixels[7], pixels[11]]).toEqual([0, 0, 255]);
    }
  });
});
