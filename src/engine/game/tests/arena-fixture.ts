import {
  Arena, Arenas, Camera, Game, GameSettings, RenderCanvas, World,
  type ArenasOptions
} from "#engine/game";
import { ColliderObject, GameObject, PhysicsObject } from "#engine/game-objects";

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

export function createArenaScene(arenas?: ArenasOptions, unloadDistanceScreens?: number) {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 320, height: 240, backend: "2d" });
  const settings = new GameSettings({
    arenas: unloadDistanceScreens == null ? null : { distanceScreens: unloadDistanceScreens }
  });

  const game = Game.camera(new Camera()).settings(settings).create(canvas);

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
      const declared = Arenas.declare({
        start: () => ({
          objects: World.of([[ArenaProbe, { bbox: [defaultX, 0, defaultX + 20, 20] }]])
        })
      }, arenas);

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
