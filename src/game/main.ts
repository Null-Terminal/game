import { Game, RenderCanvas } from "#engine/game";
import { PersonObject } from "#game/person-object";

import { staticWorld } from "#game/world";

const canvas = new RenderCanvas(document.getElementById("game") as HTMLCanvasElement, {
  showFPS: true,
});

const game = new Game(canvas, { staticWorld } );

for (let i = 0; i < 1; i++) {
  new PersonObject(game);
}
