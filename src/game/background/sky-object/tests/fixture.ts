import { Camera, Game, RenderCanvas, World } from "#engine/game";

import { SkyObject } from "#game/background/sky-object";

export interface SkyScene {
  sky: SkyObject;
  canvas: RenderCanvas;
  render(now: number): void;
  pixel(x: number, y: number): number[];
  destroy(): void;
}

export async function createSkyScene(): Promise<SkyScene> {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 320, height: 240, backend: "2d" });
  canvas.stop();

  const game = Game.camera(new Camera()).create(canvas);
  const world = await game.loadLevel(async () => new World({
    objects: World.of([[SkyObject, { show: "storm" }]])
  }));

  await Promise.resolve();

  const sky = world.objects.get(SkyObject.kind, 0);

  if (!(sky instanceof SkyObject)) {
    throw new Error("Sky fixture: sky was not created");
  }

  const ctx = element.getContext("2d")!;

  return {
    sky,
    canvas,

    render(now) {
      canvas.clear();
      canvas.emitter.emit(canvas.events.background, { ctx, now, delta: 0.016 });
    },

    pixel(x, y) {
      return Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3));
    },

    destroy: () => game.destroy()
  };
}
