import { GameObject } from "#engine/game-object";

import { SpriteAnimation } from "#/sprite-animation";

import runAnimation from "#/sprites/run.animation.json";
import run from "#/sprites/run.png";

import { renderCanvas } from "#engine/render-canvas";
import { loadSprite } from "#engine/sprite-loader";

import type { Animations } from "#engine/game-object/types";

export * from "#engine/game-object/types";

const image = await loadSprite(run);

export class PersonObject extends GameObject {
  static override animations = {
    run: [image, new SpriteAnimation(runAnimation.sprites)],
  } satisfies Animations;

  declare readonly Animations: (typeof PersonObject)["animations"];

  init() {
    this.play(this.animations.run);
  }
}

const a = new PersonObject(renderCanvas, { x: 0, y: 100 });
const b = new PersonObject(renderCanvas, { x: 200, y: 100, speed: 2 });
const c = new PersonObject(renderCanvas, { x: 400, y: 100, speed: 3 });

for (let i = 0; i < 100; i++) {
  await new Promise(resolve => setTimeout(resolve, 100));
  a.x += 1;
  b.x += 2;
  c.x += 3;
}


