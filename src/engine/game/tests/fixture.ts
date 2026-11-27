import { Camera, Game, RenderCanvas, World } from "#engine/game";

export interface LevelScene {
  game: Game;
  canvas: RenderCanvas;
  createWorld(): World;
  destroy(): void;
}

export function createLevelScene(startPaused = false): LevelScene {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 320, height: 240, backend: "2d" });
  const game = Game.camera(new Camera()).create(canvas, { startPaused });

  canvas.stop();

  return {
    game,
    canvas,
    createWorld: () => new World({ persistentObjects: [] }),
    destroy: () => game.destroy()
  };
}
