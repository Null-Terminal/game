import { describe, expect, it, vi } from "vitest";

import { AnimationDefinition } from "#lib/animation-definition";
import { EventEmitter, handler } from "#lib/event-emitter";

import { LoadedAnimation } from "#engine/animation";
import { World, type Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";
import { ColliderObject, CollisionBody, InteractObject } from "#engine/game-objects";

function createGame() {
  const world = new World({ persistentObjects: [] });
  const events = {
    scene: handler({ withFlush: true }),
    interact: handler({ withFlush: true })
  };

  const emitter = new EventEmitter(events);

  const game = {
    world,
    canvas: { events, emitter, canvas: { height: 600 } },
    sleep: { sleepIfFar() {} }
  } as unknown as Game;

  return { game, world };
}

function createAnimation(collisionY: number) {
  return new LoadedAnimation({} as ImageBitmap, new AnimationDefinition({
    params: { collisionBounds: { x: 0, y: collisionY, width: 100, height: 50 } },
    sprites: [{ x: 0, y: 0, width: 100, height: 100, duration: 100, spriteId: "" }]
  }));
}

function getObject<T extends ColliderObject>(world: World, pointer: PoolPointer, ctor: new () => T): T {
  const object = world.objects.get(...pointer);

  if (!(object instanceof ctor)) {
    throw new Error(`Expected ${ctor.name} in the object pool`);
  }

  return object;
}

describe("ColliderObject collision", () => {
  it("moves its geometry between solid and interaction trees", () => {
    const { game, world } = createGame();
    const pointer = world.objects.add(ColliderObject, game, { bbox: [0, 0, 100, 20] });
    const object = getObject(world, pointer, ColliderObject);

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
    const pointer = world.objects.add(InteractObject, game, { bbox: [0, 0, 100, 20] });
    const object = getObject(world, pointer, InteractObject);

    expect(object.collision.kind).toBe(CollisionBody.Kind.Interact);

    object.collision.toSolid();
    object.destroy();
    expect(() => object.collision.toInteract()).toThrow(/destroyed object/);

    const reused = world.objects.add(InteractObject, game, { bbox: [0, 0, 100, 20] });

    expect(world.objects.get(...reused)).toBe(object);
    expect(object.collision.kind).toBe(CollisionBody.Kind.Interact);
    expect(world.statics.search(-1, -1, 101, 21)).toHaveLength(0);
    expect(world.staticInteracts.search(-1, -1, 101, 21)).toHaveLength(1);

    object.destroy();
  });

  it("requires geometry before registering a static collision", () => {
    const { game, world } = createGame();

    expect(() => world.objects.add(ColliderObject, game, {})).toThrow(/needs width and height/);
    expect(world.statics.search(-100, -100, 100, 100)).toEqual([]);
  });

  it("keeps an explicit bbox without a sprite", () => {
    const { game, world } = createGame();
    const pointer = world.objects.add(ColliderObject, game, { bbox: [0, 0, 100, 20] });
    const object = world.objects.get(...pointer)!;

    expect(world.statics.search(-1, -1, 101, 21)[0]?.bbox).toEqual([0, 0, 100, 20]);
    object.destroy();
  });

  it("updates only when an animation changes the collision rectangle", () => {
    const { game, world } = createGame();
    const first = createAnimation(0);
    const second = createAnimation(25);

    const insert = vi.spyOn(world.statics, "insert");
    const remove = vi.spyOn(world.statics, "remove");

    const pointer = world.objects.add(ColliderObject, game, { show: first, x: 10, y: 20 });
    const object = getObject(world, pointer, ColliderObject);
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
