import { Camera, Game, RenderCanvas, World } from "#engine/game";
import type { MovementOptions } from "#engine/game-objects";

import { PersonObject } from "#game/person-object";
import { ElevatorObject, ElevatorPanelObject, industrialElevator } from "#game/platforms/elevator-object";

export interface ElevatorSceneOptions {
  rider: "floor" | "roof";
  movement?: MovementOptions;
}

export interface ElevatorScene {
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

  const game = Game.camera(new Camera({ limit: { y: 0 } })).create(canvas);

  const world = await game.loadLevel(async () => new World({
    objects: World.of([
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
    elevator: world.objects.get(ElevatorObject.kind, 0) as ElevatorObject,
    panel: world.objects.get(ElevatorPanelObject.kind, 0) as ElevatorPanelObject,
    player: world.objects.get(PersonObject.kind, 0) as PersonObject
  };
}
