import { Camera, Game, RenderCanvas, World } from "#engine/game";

import { PersonObject } from "#game/person-object";
import { PlatformObject } from "#game/platforms/platform-object";

export interface MovingPlatformScene {
  player: PersonObject;
  platform: PlatformObject;
  step(delta: number, now: number): void;
  destroy(): void;
}

export interface MovingPlatformOptions {
  platformSpeed: number;
  jetpackSpeed?: number;
  playerY?: number;
  jetpack?: boolean;
}

export async function createMovingPlatformScene({
  platformSpeed,
  jetpackSpeed = 350,
  playerY = 50,
  jetpack = true
}: MovingPlatformOptions): Promise<MovingPlatformScene> {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 640, height: 480, backend: "2d" });
  canvas.stop();

  const game = Game.camera(new Camera()).create(canvas);
  const world = await game.loadLevel(async () => new World({ objects: [] }));

  const platformPointer = world.createObject(PlatformObject, { bbox: [100, 230, 260, 250] });
  const playerPointer = world.createObject(PersonObject, { x: 150, y: playerY });

  const platform = world.objects.get(...platformPointer);
  const player = world.objects.get(...playerPointer);

  if (!(platform instanceof PlatformObject) || !(player instanceof PersonObject)) {
    throw new Error("Moving platform fixture: objects were not created");
  }

  platform.movement.follow({ at: (time) => [100, 230 - platformSpeed * time] });
  player.updateStats(() => ({ jetpack: jetpackSpeed }));
  player.actions.jetpack = jetpack ? 1 : 0;

  return {
    player,
    platform,

    step(delta, now) {
      const ctx = element.getContext("2d")!;
      const frame = { ctx, delta, now };

      canvas.emitter.emit(canvas.events.beforeRender, frame);
      canvas.emitter.emit(canvas.events.background, frame);
      canvas.emitter.emit(canvas.events.static, frame);
      canvas.emitter.emit(canvas.events.dynamic, frame);
      canvas.emitter.emit(canvas.events.interact, frame);
      canvas.emitter.emit(canvas.events.main, frame);
      canvas.emitter.emit(canvas.events.overlay, frame);
      canvas.emitter.emit(canvas.events.ui, frame);
    },

    destroy: () => game.destroy()
  };
}
