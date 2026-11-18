import { Arenas, Camera, Game, RenderCanvas, World } from "#engine/game";

import { ControlObject, type ControlKind } from "#game/control-object";
import { LiquidObject, type LiquidKind } from "#game/liquid-object";
import { PersonObject } from "#game/person-object";
import { PickupObject, type PickupKind } from "#game/pickup-object";
import { ArenaBoundaryObject, ArenaTerminalObject } from "#game/world";

export interface InteractionScene {
  game: Game;
  canvas: RenderCanvas;
  player: PersonObject;
  World: typeof World;
  Arenas: typeof Arenas;
  PersonObject: typeof PersonObject;
  ArenaBoundaryObject: typeof ArenaBoundaryObject;
  PickupObject: typeof PickupObject;
  ControlObject: typeof ControlObject;
  createControl(kind: ControlKind): ControlObject;
  createArenaTerminal(): ArenaTerminalObject;
  createPickup(kind: PickupKind): PickupObject;
  createLiquid(kind: LiquidKind): LiquidObject;
  destroy(): void;
}

export async function createInteractionScene(): Promise<InteractionScene> {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 640, height: 480, backend: "2d" });
  const game = Game.camera(new Camera()).create(canvas);

  const arenas = Arenas.declare({ base: () => ({ objects: [] }) });
  arenas.preload(arenas.refs.base);

  const world = await game.loadLevel(async () => new World({
    persistentObjects: World.of([[PersonObject, { x: 100, y: 100 }]]),
    arenas
  }));

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  canvas.stop();

  const player = world.objects.get(PersonObject.kind, 0);

  if (!(player instanceof PersonObject)) {
    throw new Error("Interaction fixture: player was not created");
  }

  return {
    game,
    canvas,
    player,
    World,
    Arenas,
    PersonObject,
    ArenaBoundaryObject,
    PickupObject,
    ControlObject,

    createControl(kind) {
      return createObject(ControlObject, { kind, x: 400, y: 100 });
    },

    createArenaTerminal() {
      return createObject(ArenaTerminalObject, { kind: "aiTerminal", x: 400, y: 100 });
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
    opts: Parameters<T["create"]>[2]
  ): T {
    const pointer = world.createObject(Class, opts);
    const object = world.objects.get(...pointer);

    if (!(object instanceof Class)) {
      throw new Error("Interaction fixture: object was not created");
    }

    return object;
  }
}
