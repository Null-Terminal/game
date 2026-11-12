import { describe, expect, it, vi } from "vitest";

import { AnimationDefinition } from "#/animation-definition";
import { EventEmitter, handler } from "#/event-emitter";

import { LoadedAnimation } from "#engine/animation";
import type { Game } from "#engine/game";
import { World } from "#engine/game/world";
import { ColliderObject, CollisionBody } from "#engine/game-objects/collider-object";
import { InteractObject } from "#engine/game-objects/interact-object";

function createGame() {
  const world = new World({ objects: [] });
  const events = {
    scene: handler({ withFlush: true }),
    interact: handler({ withFlush: true })
  };
  const emitter = new EventEmitter(events);

  const game = {
    world,
    canvas: { events, emitter, canvas: { height: 600 } },
    sleep: { prepare() {} }
  } as unknown as Game;

  return { game, world };
}

function createAnimation(collisionY: number) {
  return new LoadedAnimation({} as ImageBitmap, new AnimationDefinition({
    params: { collisionBounds: { x: 0, y: collisionY, width: 100, height: 50 } },
    sprites: [{ x: 0, y: 0, width: 100, height: 100, duration: 100, spriteId: "" }]
  }));
}

describe("ColliderObject collision", () => {
  it("moves its geometry between solid and interaction trees", () => {
    const { game, world } = createGame();
    const object = new ColliderObject();

    object.create(game, [1, 0], { bbox: [0, 0, 100, 20] });
    expect(world.statics.search(-1, -1, 101, 21)).toHaveLength(1);

    object.collision.toInteract();
    expect(object.collision.kind).toBe(CollisionBody.Kind.Interact);
    expect(world.statics.search(-1, -1, 101, 21)).toHaveLength(0);
    expect(world.staticInteracts.search(-1, -1, 101, 21)).toHaveLength(1);

    object.collision.toSolid();
    expect(world.staticInteracts.search(-1, -1, 101, 21)).toHaveLength(0);
    expect(world.statics.search(-1, -1, 101, 21)).toHaveLength(1);

    object.destroy();
  });

  it("restores the default kind when a pooled object is created again", () => {
    const { game, world } = createGame();
    const object = new InteractObject();

    object.create(game, [1, 0], { bbox: [0, 0, 100, 20] });
    expect(object.collision.kind).toBe(CollisionBody.Kind.Interact);

    object.collision.toSolid();
    object.destroy();
    expect(() => object.collision.toInteract()).toThrow(/destroyed object/);

    object.create(game, [1, 0], { bbox: [0, 0, 100, 20] });

    expect(object.collision.kind).toBe(CollisionBody.Kind.Interact);
    expect(world.statics.search(-1, -1, 101, 21)).toHaveLength(0);
    expect(world.staticInteracts.search(-1, -1, 101, 21)).toHaveLength(1);

    object.destroy();
  });

  it("requires geometry before registering a static collision", () => {
    const { game, world } = createGame();
    const object = new ColliderObject();

    expect(() => object.create(game, [1, 0], {})).toThrow(/needs width and height/);
    expect(world.statics.search(-100, -100, 100, 100)).toEqual([]);
  });

  it("keeps an explicit bbox without a sprite", () => {
    const { game, world } = createGame();
    const object = new ColliderObject();

    object.create(game, [1, 0], { bbox: [0, 0, 100, 20] });

    expect(world.statics.search(-1, -1, 101, 21)[0]?.bbox).toEqual([0, 0, 100, 20]);
    object.destroy();
  });

  it("updates only when an animation changes the collision rectangle", () => {
    const { game, world } = createGame();
    const object = new ColliderObject();
    const first = createAnimation(0);
    const second = createAnimation(25);

    const insert = vi.spyOn(world.statics, "insert");
    const remove = vi.spyOn(world.statics, "remove");

    object.create(game, [1, 0], { show: first, x: 10, y: 20 });
    object.play(first);

    expect(insert).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();

    object.play(second);

    expect(insert).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(world.statics.search(0, 0, 200, 200)[0]?.bbox).toEqual([10, 45, 110, 95]);

    object.destroy();
  });
});
