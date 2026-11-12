import { AnimationDefinition } from "#/animation-definition";

import { LoadedAnimation } from "#engine/animation";
import { Camera, Game, RenderCanvas, World } from "#engine/game";
import { BackgroundFlowObject } from "#engine/game-objects/background-flow-object";

export interface FlowScene {
  flow: BackgroundFlowObject;
  first: LoadedAnimation;
  second: LoadedAnimation;
  renderAt(now: number): void;
  colorAt(x: number, y: number): number[];
  destroy(): void;
}

export async function createFlowScene(): Promise<FlowScene> {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, {
    width: 100,
    height: 100,
    backgroundColor: "#FFFFFF",
    backend: "2d"
  });
  canvas.stop();

  const first = createAnimation(["#FF0000", "#00FF00"], 50);
  const second = createAnimation(["#0000FF", "#FFFF00"], 100);
  const game = Game.camera(new Camera()).create(canvas);

  const world = await game.loadLevel(async () => new World({
    objects: World.of([[
      BackgroundFlowObject,
      { sprites: [first, second], order: "round-robin", gap: 0, seed: 1, y: 10 }
    ]])
  }));

  const flow = world.objects.get(BackgroundFlowObject.kind, 0) as BackgroundFlowObject;
  const ctx = element.getContext("2d")!;

  return {
    flow,
    first,
    second,

    renderAt(now) {
      canvas.clear();
      canvas.emitter.emit(canvas.events.background, { ctx, now, delta: 0.016 });
    },

    colorAt(x, y) {
      return Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3));
    },

    destroy() {
      game.destroy();
    }
  };
}

function createAnimation(colors: readonly [string, string], duration: number): LoadedAnimation {
  const source = new OffscreenCanvas(20, 10);
  const ctx = source.getContext("2d")!;

  for (const [index, color] of colors.entries()) {
    ctx.fillStyle = color;
    ctx.fillRect(index * 10, 0, 10, 10);
  }

  return new LoadedAnimation(source.transferToImageBitmap(), new AnimationDefinition({
    sprites: colors.map((_, index) => ({
      x: index * 10,
      y: 0,
      width: 10,
      height: 10,
      duration,
      spriteId: ""
    }))
  }));
}
