import { AnimationDefinition } from "#/animation-definition";

import { LoadedAnimation } from "#engine/animation";
import { Camera, Game, RenderCanvas, World } from "#engine/game";
import { BackgroundObject } from "#engine/game-objects/background-object";
import type { DefaultBackgroundObjectOptions } from "#engine/game-objects/background-object/types";
import type { BBoxTuple } from "#engine/rtree";

export interface BackgroundSceneOptions extends Pick<DefaultBackgroundObjectOptions, "scrollFactor" | "static" | "stretch"> {
  bbox: BBoxTuple;
}

export interface BackgroundScene {
  game: Game;
  render(): void;
  pixel(x: number, y: number): number[];
  destroy(): void;
}

export async function createBackgroundScene(opts: BackgroundSceneOptions): Promise<BackgroundScene> {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, {
    width: 100,
    height: 100,
    backgroundColor: "#000000",
    backend: "2d"
  });

  canvas.stop();

  const game = Game.camera(new Camera()).create(canvas);
  const world = await game.loadLevel(async () => new World({ objects: [] }));

  const source = new OffscreenCanvas(10, 10);
  const sourceCtx = source.getContext("2d")!;
  sourceCtx.fillStyle = "#FF0000";
  sourceCtx.fillRect(0, 0, 10, 10);

  const image = source.transferToImageBitmap();
  const animation = new LoadedAnimation(image, new AnimationDefinition({
    sprites: [{ x: 0, y: 0, width: 10, height: 10, duration: 100, spriteId: "" }]
  }));

  world.createObject(BackgroundObject, { ...opts, show: animation });

  const ctx = element.getContext("2d")!;

  return {
    game,

    render() {
      canvas.clear();
      canvas.emitter.emit(canvas.events.background, { ctx, delta: 0.016, now: 16 });
    },

    pixel(x, y) {
      return Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3));
    },

    destroy() {
      game.destroy();
      image.close();
    }
  };
}
