import { describe, expect, it } from "vitest";

import { AnimationDefinition, type SpriteDescriptor } from "#/animation-definition";

const frames: SpriteDescriptor[] = [
  { x: 0, y: 0, width: 32, height: 24, duration: 80, spriteId: "idle" },
  { x: 32, y: 0, width: 24, height: 24, duration: 120, spriteId: "move" }
];

describe("AnimationDefinition", () => {
  it("fills playback defaults without changing the supplied frames", () => {
    const definition = new AnimationDefinition({ sprites: frames });

    expect(definition.params).toMatchObject({
      speed: 1,
      scale: 1,
      opacity: 1,
      loopFrom: 0,
      order: "forward"
    });

    expect(definition.length).toBe(2);
    expect([...definition]).toEqual(frames);
    expect(definition.at(1)?.spriteId).toBe("move");
  });

  it("round-trips its frames and parameters through a data URL", () => {
    const original = new AnimationDefinition({
      sprites: frames,
      params: { order: "ping-pong", speed: 2 }
    });

    const encoded = original.toDataURL().split(",", 2)[1]!;
    const restored = AnimationDefinition.fromJSON(decodeURIComponent(encoded));

    expect(restored.params).toEqual(original.params);
    expect([...restored]).toEqual(frames);
  });

  it("reads TexturePacker frames in their declared order", () => {
    const definition = AnimationDefinition.fromJSON(JSON.stringify({
      frames: {
        idle: { frame: { x: 1, y: 2, w: 12, h: 16 }, duration: 90 },
        run: { frame: { x: 13, y: 2, w: 14, h: 16 }, duration: 60 }
      }
    }));

    expect([...definition]).toEqual([
      { x: 1, y: 2, width: 12, height: 16, duration: 90, spriteId: "" },
      { x: 13, y: 2, width: 14, height: 16, duration: 60, spriteId: "" }
    ]);
  });

  it("requires collision and repeat regions to fit every frame", () => {
    const fitsBoth = { x: 4, y: 2, width: 20, height: 18 };
    const exceedsSecond = { x: 8, y: 2, width: 20, height: 18 };

    expect(() => new AnimationDefinition({
      sprites: frames,
      params: { collisionBounds: fitsBoth, repeat: { width: fitsBoth, height: fitsBoth } }
    })).not.toThrow();

    expect(() => new AnimationDefinition({
      sprites: frames,
      params: { collisionBounds: exceedsSecond }
    })).toThrow(/collisionBounds must fit within every sprite frame/);

    expect(() => new AnimationDefinition({
      sprites: frames,
      params: { repeat: { width: exceedsSecond } }
    })).toThrow(/repeat.width must fit within every sprite frame/);
  });

  it("rejects an unknown playback order", () => {
    expect(() => new AnimationDefinition({
      sprites: frames,
      params: { order: "sideways" }
    })).toThrow(/Unknown animation order: sideways/);
  });
});
