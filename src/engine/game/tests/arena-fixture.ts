import { Arena, Arenas, Camera, Game, RenderCanvas, World } from "#engine/game";
import type { ArenasOptions } from "#engine/game";
import { ColliderObject } from "#engine/game-objects/collider-object";
import { GameObject } from "#engine/game-objects/game-object";
import { PhysicsObject } from "#engine/game-objects/physics-object";

export class ArenaProbe extends ColliderObject {
  override init() {}
}

export class GlobalProbe extends GameObject {
  override init() {}
}

export class ChildProbe extends GameObject {
  override init() {}
}

export class CompositeProbe extends GameObject {
  static override readonly with = {
    child: [ChildProbe, {}]
  } as const;

  override init() {}
}

export class FailingArenaProbe extends GameObject {
  override init() {
    throw new Error("arena object failed");
  }
}

export class CameraProbe extends PhysicsObject {
  override init() {
    this.onDestroy(this.game.camera.bindTo(this));
  }
}

export function createArenaScene(arenas?: ArenasOptions) {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 320, height: 240, backend: "2d" });
  const game = Game.camera(new Camera()).create(canvas);

  return {
    game,
    canvas,
    arenaOptions: arenas,
    ArenaProbe,
    GlobalProbe,
    ChildProbe,
    CompositeProbe,
    FailingArenaProbe,
    CameraProbe,
    Arena,
    Arenas,
    World,
    createWorld: (defaultX = 0) => {
      const declared = Arenas.declare({ start: () => ({
        objects: World.of([[ArenaProbe, { bbox: [defaultX, 0, defaultX + 20, 20] }]])
      }) }, arenas);

      declared.preload(declared.refs.start);
      return new World({
        persistentObjects: World.of([[GlobalProbe, { x: 100 }]]),
        arenas: declared
      });
    },
    destroy: () => game.destroy()
  };
}

export type ArenaScene = ReturnType<typeof createArenaScene>;
