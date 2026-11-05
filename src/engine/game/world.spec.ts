import { describe, expect, it, vi } from "vitest";

import { AnimationDefinition } from "#/animation-definition";
import { LoadedAnimation } from "#engine/animation";
import { World } from "#engine/game/world";
import type { GameObject } from "#engine/game-objects";

describe("World collision bounds", () => {
  it("keeps the contact surface inside a sprite drawn in perspective", () => {
    const animation = new LoadedAnimation({} as ImageBitmap, new AnimationDefinition({
      params: { maxHeight: 40, collisionBounds: { x: 10, y: 40, width: 180, height: 50 } },
      sprites: [{ x: 0, y: 0, width: 200, height: 100, duration: 100, spriteId: "" }]
    }));

    const world = new World({ objects: [] });
    const object = {
      poolPointer: [1, 2],
      nowPlaying: animation,
      bbox: null,
      x: 100,
      y: 200,
      width: 80,
      height: 40,
      effects: { scale: 1 }
    } as unknown as GameObject;

    world.addToWorld(object, world.dynamics);

    expect(world.dynamics.search(0, 0, 300, 300)).toEqual([
      { bbox: [104, 204, 176, 224], pointer: [1, 2] }
    ]);
  });

  it("applies sprite collision insets to a patterned object with explicit bbox", () => {
    const animation = new LoadedAnimation({} as ImageBitmap, new AnimationDefinition({
      params: { maxHeight: 40, collisionBounds: { x: 10, y: 40, width: 180, height: 50 } },
      sprites: [{ x: 0, y: 0, width: 200, height: 100, duration: 100, spriteId: "" }]
    }));

    const world = new World({ objects: [] });
    const object = {
      poolPointer: [1, 2],
      nowPlaying: animation,
      bbox: [100, 200, 300, 240],
      x: 100,
      y: 200,
      width: 200,
      height: 40,
      effects: { scale: 1 }
    } as unknown as GameObject;

    world.addToWorld(object, world.dynamics);

    expect(world.dynamics.search(0, 0, 400, 300)[0]?.bbox).toEqual([104, 204, 296, 224]);
  });

  it("keeps an unchanged collision entry and updates changed bounds", () => {
    const animation = new LoadedAnimation({} as ImageBitmap, new AnimationDefinition({
      params: { collisionBounds: { x: 0, y: 0, width: 100, height: 100 } },
      sprites: [{ x: 0, y: 0, width: 100, height: 100, duration: 100, spriteId: "" }]
    }));

    const world = new World({ objects: [] });
    const object = {
      poolPointer: [1, 2],
      nowPlaying: animation,
      x: 100,
      y: 200,
      width: 100,
      height: 100,
      effects: { scale: 1 }
    } as unknown as GameObject;

    const insert = vi.spyOn(world.statics, "insert");
    const remove = vi.spyOn(world.statics, "remove");

    const first = world.addToWorld(object, world.statics, null);
    const same = world.addToWorld(object, world.statics, first);

    expect(same).toBe(first);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();

    object.x = 110;
    const changed = world.addToWorld(object, world.statics, same);

    expect(changed).toEqual([1, 2, 110, 200, 210, 300]);
    expect(insert).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(world.statics.search(0, 0, 400, 400)).toEqual([
      { bbox: [110, 200, 210, 300], pointer: [1, 2] }
    ]);
  });
});
