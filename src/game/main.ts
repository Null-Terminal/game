import { Game, RenderCanvas } from "#engine/game";
import { PersonObject } from "#game/person-object";
import { PlatformObject } from "#game/platform-object";

import { staticWorld } from "#game/world";

const canvas = new RenderCanvas(document.getElementById("game") as HTMLCanvasElement, {
  showFPS: true,
});

const game = new Game(canvas, { staticWorld } );

game.world.createObject(PlatformObject, { bbox: [50, 140, 130, 170] });

for (let i = 0; i < 1; i++) {
  game.world.createObject(PersonObject);
}
