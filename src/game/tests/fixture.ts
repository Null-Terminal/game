import { Camera, Game, RenderCanvas, World } from "#engine/game";

import { ControlObject, type ControlKind } from "#game/control-object";
import { LiquidObject, type LiquidKind } from "#game/liquid-object";
import { PersonObject } from "#game/person-object";
import { PickupObject, type PickupKind } from "#game/pickup-object";

export interface InteractionScene {
  game: Game;
  canvas: RenderCanvas;
  player: PersonObject;
  createControl(kind: ControlKind): ControlObject;
  createPickup(kind: PickupKind): PickupObject;
  createLiquid(kind: LiquidKind): LiquidObject;
  destroy(): void;
}

export async function createInteractionScene(): Promise<InteractionScene> {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 640, height: 480 });
  const game = Game.camera(new Camera()).create(canvas);

  const world = await game.loadLevel(async () => new World({
    objects: World.of([[PersonObject, { x: 100, y: 100 }]])
  }));

  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  canvas.stop();

  const player = world.objects.get(PersonObject.kind, 0);

  if (!(player instanceof PersonObject)) {
    throw new Error("Interaction fixture: player was not created");
  }

  return {
    game,
    canvas,
    player,

    createControl(kind) {
      return createObject(ControlObject, { kind, x: 400, y: 100 });
    },

    createPickup(kind) {
      return createObject(PickupObject, { kind, x: 400, y: 100 });
    },

    createLiquid(kind) {
      return createObject(LiquidObject, { kind, bbox: [400, 0, 500, 40] });
    },

    destroy: () => game.destroy()
  };

  function createObject<T extends ControlObject | PickupObject | LiquidObject>(
    Class: { kind: number; new(): T },
    options: Parameters<T["create"]>[2]
  ): T {
    const pointer = world.createObject(Class, options);
    const object = world.objects.get(...pointer);

    if (!(object instanceof Class)) {
      throw new Error("Interaction fixture: object was not created");
    }

    return object;
  }
}
