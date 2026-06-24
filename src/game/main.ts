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
  bbox: [350, 770, 430, 800],
  movePath: [
    [700, 500],
    [400, 500],
    [600, 600],
    [350, 770]
   ]
});

game.world.createObject(SkyboxObject);
game.world.createObject(FloorObject);

for (let i = 0; i < 1; i++) {
  game.world.createObject(PersonObject, { y: 1000, x: 300 });
}
