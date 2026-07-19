import { Disposable } from "#engine/disposable";

import { Camera } from "#engine/game/camera";
import { World, type WorldOptions } from "#engine/game/world";
import type { RenderCanvas } from "#engine/game/render-canvas";

export { World } from "#engine/game/world";
export type { WorldOptions, Collision, WorldObject, WorldObjects } from "#engine/game/world";

export { RenderCanvas } from "#engine/game/render-canvas";
export type { RenderCanvasOptions, RenderPayload } from "#engine/game/render-canvas";

export class Game extends Disposable {
  readonly camera: Camera;
  readonly world: World;
  readonly canvas: RenderCanvas;

  constructor(renderCanvas: RenderCanvas, world: WorldOptions) {
    super();
    this.canvas = renderCanvas;
    this.camera = new Camera(this);
    this.world = new World(this, world);
  }

  override destroy() {
    super.destroy();
    this.canvas.destroy();
    this.world.destroy();
  }
}
