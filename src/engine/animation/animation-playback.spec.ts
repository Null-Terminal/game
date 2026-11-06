import { describe, expect, it, vi } from "vitest";

import { AnimationDefinition, type AnimationOrder } from "#/animation-definition";
import { cast } from "#/tstools";

import { AnimationPlayback } from "#engine/animation/animation-playback";
import { LoadedAnimation } from "#engine/animation/loaded-animation";

describe("AnimationPlayback", () => {
  it("plays forward and repeats from the chosen frame", () => {
    const playback = createPlayback("forward", { loopFrom: 1 });

    expect(framesAt(playback, [0, 100, 200, 300, 400])).toEqual([0, 1, 2, 1, 2]);
  });

  it("returns through the frames in ping-pong order", () => {
    const playback = createPlayback("ping-pong");

    expect(framesAt(playback, [0, 100, 200, 300, 400, 500])).toEqual([0, 1, 2, 1, 0, 1]);
  });

  it("uses playback speed to determine when the next frame starts", () => {
    const playback = createPlayback("forward", { speed: 2 });

    expect(framesAt(playback, [0, 49, 50, 99, 100])).toEqual([0, 0, 1, 1, 2]);
  });

  it("starts from a random frame and chooses another at the next boundary", () => {
    const random = vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.8)
      .mockReturnValueOnce(0.1);

    try {
      const playback = createPlayback("random");

      expect(playback.frameIndex).toBe(2);
      playback.advance(100);
      expect(playback.frameIndex).toBe(0);

    } finally {
      random.mockRestore();
    }
  });

  it("emits on the first frame and on frames with a sprite ID", () => {
    const playback = createPlayback("forward", {}, ["", "entered", ""]);

    expect(playback.shouldEmitEvent).toBe(true);

    playback.advance(0);
    expect(playback.shouldEmitEvent).toBe(false);

    playback.advance(100);
    expect(playback.shouldEmitEvent).toBe(true);

    playback.advance(200);
    expect(playback.shouldEmitEvent).toBe(false);
  });

  it("cannot play a definition without frames", () => {
    const animation = new LoadedAnimation(cast<ImageBitmap>({}), new AnimationDefinition({ sprites: [] }));

    expect(() => new AnimationPlayback(animation)).toThrow(/without frames/);
  });
});

function createPlayback(
  order: AnimationOrder,
  params: { loopFrom?: number; speed?: number } = {},
  spriteIds: readonly string[] = ["", "", ""]
): AnimationPlayback {
  const definition = new AnimationDefinition({
    params: { order, ...params },
    sprites: spriteIds.map((spriteId, index) => ({
      x: index * 10,
      y: 0,
      width: 10,
      height: 10,
      duration: 100,
      spriteId
    }))
  });

  return new AnimationPlayback(new LoadedAnimation(cast<ImageBitmap>({}), definition));
}

function framesAt(playback: AnimationPlayback, elapsedTimes: readonly number[]): number[] {
  return elapsedTimes.map((elapsed) => {
    playback.advance(elapsed);
    return playback.frameIndex;
  });
}
