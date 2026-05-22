import { Game, RenderCanvas } from "#engine/game";
import { PersonObject } from "#game/person-object";

import { staticWorld } from "#game/world";

const canvas = new RenderCanvas(document.getElementById("game") as HTMLCanvasElement, {
  showFPS: true,
});

const game = new Game(canvas, { staticWorld });

new PersonObject(game, { effects: { scale: 0.3 } });
