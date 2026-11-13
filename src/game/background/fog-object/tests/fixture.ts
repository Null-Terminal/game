import { Camera, Game, RenderCanvas, World } from "#engine/game";

import { FogObject } from "#game/background/fog-object";

export interface FogScene {
  fog: FogObject;
  canvas: RenderCanvas;
  render(now: number): void;
  destroy(): void;
}

export async function createFogScene(): Promise<FogScene> {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 320, height: 240, backend: "2d" });
  canvas.stop();

  const game = Game.camera(new Camera()).create(canvas);
  const world = await game.loadLevel(async () => new World({
    objects: World.of([[
      FogObject,
      {
        show: "fog",
        bbox: [-Infinity, 80, Infinity, 180],
        texture: { density: 0, seed: 1 },
        opacity: 1,
        speed: 0,
        scrollFactor: [0.1, 0.2],
        debug: { bounds: true, inspect: true }
      }
    ]])
  }));

  const fog = world.objects.get(FogObject.kind, 0);

  if (!(fog instanceof FogObject)) {
    throw new Error("Fog fixture: object was not created");
  }

  const ctx = element.getContext("2d")!;

  return {
    fog,
    canvas,

    render(now) {
      canvas.clear();
      canvas.emitter.emit(canvas.events.background, { ctx, now, delta: 0.016 });
    },

    destroy: () => game.destroy()
  };
}
