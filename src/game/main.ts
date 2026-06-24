import { Game, RenderCanvas } from "#engine/game";
import { PersonObject } from "#game/person-object";
import { PlatformObject } from "#game/platform-object";

import { SkyboxObject } from "#game/skybox-object";
import { FloorObject } from "#game/floor-object";

import { staticWorld } from "#game/world";

const canvas = new RenderCanvas(document.getElementById("game") as HTMLCanvasElement, {
  width: 1920,
  height: 1080,
  showFPS: true,
});

const game = new Game(canvas, { staticWorld } );

game.world.createObject(PlatformObject, {
  bbox: [50, 270, 130, 300],
  movePath: [
    [200, 180],
    [400, 180],
    [600, 600],
    [100, 600]
  ]
});

game.world.createObject(SkyboxObject);
game.world.createObject(FloorObject);

for (let i = 0; i < 1; i++) {
  game.world.createObject(PersonObject, { y: 1000, x: 300 });
}
