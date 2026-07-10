import { Game, RenderCanvas } from "#engine/game";

import { staticWorld } from "#game/world";

import { PersonObject } from "#game/person-object";

const canvas = new RenderCanvas(document.getElementById("game") as HTMLCanvasElement, {
  width: window.innerWidth,
  height: window.innerHeight,
  showFPS: true,
});

const game = new Game(canvas, { staticWorld } );

game.world.createObject(PersonObject, { y: 1000, x: 300 });
