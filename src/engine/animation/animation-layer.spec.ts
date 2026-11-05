import { describe, expect, it } from "vitest";

import { AnimationDefinition } from "#/animation-definition";
import { AnimationLayer } from "#engine/animation/animation-layer";
import { LoadedAnimation } from "#engine/animation/loaded-animation";

describe("AnimationLayer collision bounds", () => {
  it("uses the same center anchor and scale as a separately drawn roof", () => {
    const animation = new LoadedAnimation({} as ImageBitmap, new AnimationDefinition({
      params: { maxWidth: 100, collisionBounds: { x: 10, y: 20, width: 180, height: 70 } },
      sprites: [{ x: 0, y: 0, width: 200, height: 100, duration: 100, spriteId: "" }]
    }));

    const layer = new AnimationLayer(animation, { x: 0, y: 0 }, { scale: 2 }, "center", "center");

    expect(layer.getCollisionBounds(300, 400)).toEqual([210, 360, 390, 430]);
  });
});
