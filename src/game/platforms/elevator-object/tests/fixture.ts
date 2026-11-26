import { Camera, Game, GameSettings, RenderCanvas, World } from "#engine/game";
import type { MovementOptions } from "#engine/game-objects";

import { PersonObject } from "#game/characters/person-object";
import { GameInput } from "#game/input";
import { ElevatorObject, ElevatorPanelObject, industrialElevator } from "#game/platforms/elevator-object";
import { defaultProjectSettings } from "#game/settings";

export interface ElevatorSceneOptions {
  rider: "floor" | "roof";
  movement?: MovementOptions;
}

export interface ElevatorScene {
  World: typeof World;
  world: World;
  ElevatorObject: typeof ElevatorObject;
  elevator: ElevatorObject;
  panel: ElevatorPanelObject;
  player: PersonObject;
}

export async function createElevatorScene(opts: ElevatorSceneOptions): Promise<ElevatorScene> {
  const canvas = new RenderCanvas(document.getElementById("game") as HTMLCanvasElement, {
    width: 900,
    height: 650,
    backgroundColor: "#080E1F",
    backend: "2d"
  });

  const game = Game.camera(new Camera({ limit: { y: 0 } })).settings(new GameSettings(defaultProjectSettings))
    .input((game) => new GameInput(game)).create(canvas);

  const world = await game.loadLevel(async () => new World({
    persistentObjects: World.of([
      [ElevatorObject, {
        ...industrialElevator,
        x: 350,
        y: 100,
        stops: [[0, 0], [100, 0], [100, 100]],
        speed: 200,
        ...(opts.movement == null ? {} : { movement: opts.movement })
      }],
      [PersonObject, {
        x: opts.rider === "roof" ? 420 : 400,
        y: opts.rider === "roof" ? 390 : 170
      }]
    ])
  }));

  return {
    World,
    world,
    ElevatorObject,
    elevator: world.objects.get(ElevatorObject.kind, 0) as ElevatorObject,
    panel: world.objects.get(ElevatorPanelObject.kind, 0) as ElevatorPanelObject,
    player: world.objects.get(PersonObject.kind, 0) as PersonObject
  };
}
