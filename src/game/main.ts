import { Game, RenderCanvas } from "#engine/game";

import { PersonObject } from "#game/person-object";
import { PlatformObject } from "#game/platform-object";
import { FillerObject } from "#game/filler-object";

import { staticWorld } from "#game/world";

const canvas = new RenderCanvas(document.getElementById("game") as HTMLCanvasElement, {
  width: 1920,
  height: 1080,
  showFPS: true,
});

const game = new Game(canvas, { staticWorld } );

game.world.createObject(PlatformObject, {
  bbox: [350, 770, 430, 800],
  movement: {
    path: [
      [700, 500],
      [400, 500],
      [600, 600],
      [350, 770]
    ],

    speed: 300
  }
});

game.world.createObject(FillerObject, {
  show: "night",
  stretchWidth: true,
});

game.world.createObject(FillerObject, {
  show: "asphalt",
  stretchWidth: true,
});

game.world.createObject(FillerObject, {
  y: 140,
  show: "meshFence",
  stretchWidth: true,
  effects: { scale: 0.7, opacity: 0.7 },
});

for (let i = 0; i < 1; i++) {
  game.world.createObject(PersonObject, { y: 1000, x: 300 });
}
