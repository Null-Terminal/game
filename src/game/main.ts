import { Camera, Game, RenderCanvas, World } from "#engine/game";

import { world } from "#game/world";

import { PersonObject } from "#game/person-object";

const canvas = new RenderCanvas(document.getElementById("game") as HTMLCanvasElement, {
  width: window.innerWidth,
  height: window.innerHeight,
  showFPS: true,
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const game = Game
  .camera(new Camera({
    smoothness: 0.3,
    deadZone: { left: 350, right: 350, top: 250, bottom: 250 },
    limit: { y: 0 },
  }))

  .world(new World({ objects: world }))
  .create(canvas);

game.world.createObject(PersonObject, { y: 1000, x: 300 });
