import { Disposable } from "#engine/disposable";
import { GameStatus } from "#engine/game/game-status";

import type { Camera } from "#engine/game/camera";
import type { World } from "#engine/game/world";
import type { RenderCanvas } from "#engine/game/render-canvas";

export { Camera } from "#engine/game/camera";
export type * from "#engine/game/camera";

export { World } from "#engine/game/world";
export type * from "#engine/game/world";

export { RenderCanvas } from "#engine/game/render-canvas";
export type * from "#engine/game/render-canvas";

export class Game extends Disposable {
  static camera(camera: Camera) {
    return {
      world: (world: World) => ({
        create: (canvas: RenderCanvas) => new Game(canvas, camera, world),
      }),
    };
  }

  static world(world: World) {
    return {
      camera: (camera: Camera) => ({
        create: (canvas: RenderCanvas) => new Game(canvas, camera, world),
      }),
    };
  }

  readonly camera: Camera;
  readonly world: World;
  readonly canvas: RenderCanvas;
  readonly status = new GameStatus(this);

  protected constructor(canvas: RenderCanvas, camera: Camera, world: World) {
    super();

    this.world = world;
    this.camera = camera;
    this.canvas = canvas;

    camera.mount(this);
    world.mount(this);

    window.addEventListener("keydown", (e) => {
      if (e.code === "Escape") {
        e.preventDefault();
        this.status.togglePause();
      }
    }, { signal: this.abortSignal });
  }

  override destroy() {
    super.destroy();
    this.world.destroy();
    this.camera.destroy();
    this.canvas.destroy();
  }
}
