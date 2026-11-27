import { Camera, Game, GameSettings, RenderCanvas, World } from "#engine/game";

import { GameInput } from "#game/input";
import { PersonObject } from "#game/characters/person-object";
import { PlatformObject } from "#game/platforms/platform-object";
import { defaultProjectSettings } from "#game/settings";

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

  const game = Game.camera(new Camera()).settings(new GameSettings(defaultProjectSettings))
    .input((game) => new GameInput(game)).create(canvas);

  const world = await game.loadLevel(async () => new World({ persistentObjects: [] }));

  const platformPointer = world.createObject(PlatformObject, { bbox: [100, 230, 260, 250] });
  const playerPointer = world.createObject(PersonObject, { x: 150, y: playerY });

  const platform = world.objects.get(...platformPointer);
  const player = world.objects.get(...playerPointer);

  if (!(platform instanceof PlatformObject) || !(player instanceof PersonObject)) {
    throw new Error("Moving platform fixture: objects were not created");
  }

  platform.movement.follow({ at: (time) => [100, 230 - platformSpeed * time] });
  player.updateStats(() => ({ jetpack: jetpackSpeed }));
  if (jetpack) {
    player.input.press("test:jetpack", "jetpack");
  } else {
    player.input.release("test:jetpack");
  }

  return {
    player,
    platform,

    step(delta, now) {
      const ctx = element.getContext("2d")!;
      const frame = { ctx, delta, now };

      canvas.events.beforeRender.emit(frame);
      canvas.events.background.emit(frame);
      canvas.events.scene.emit(frame);
      canvas.events.interact.emit(frame);
      canvas.events.main.emit(frame);
      canvas.events.overlay.emit(frame);
      canvas.events.ui.emit(frame);
    },

    destroy: () => game.destroy()
  };
}
