import { Camera, Game, RenderCanvas, World } from "#engine/game";

import { WindDebrisObject } from "#game/background/wind-debris-object";
import { roadDebris } from "#game/background/wind-debris-object/presets";

export interface WindDebrisScene {
  debris: WindDebrisObject;
  canvas: RenderCanvas;
  render(now: number): void;
  destroy(): void;
}

export async function createWindDebrisScene(): Promise<WindDebrisScene> {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 600, height: 240, backend: "2d" });
  canvas.stop();

  const game = Game.camera(new Camera()).create(canvas);
  const world = await game.loadLevel(async () => new World({
    objects: World.of([[
      WindDebrisObject,
      {
        ...roadDebris,
        particles: {
          tumbleweed: { ...roadDebris.particles.tumbleweed, count: 10 },
          newspaper: { ...roadDebris.particles.newspaper, count: 10 }
        },
        debug: { bounds: true, inspect: true }
      }
    ]])
  }));

  const debris = world.objects.get(WindDebrisObject.kind, 0);

  if (!(debris instanceof WindDebrisObject)) {
    throw new Error("Wind debris fixture: object was not created");
  }

  const ctx = element.getContext("2d")!;

  return {
    debris,
    canvas,

    render(now) {
      canvas.clear();
      canvas.emitter.emit(canvas.events.background, { ctx, now, delta: 0.016 });
    },

    destroy: () => game.destroy()
  };
}
