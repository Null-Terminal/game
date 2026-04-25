import { GameObject } from "#engine/game-object";

import { SpriteAnimation } from "#/sprite-animation";

import runAnimation from "#/sprites/run.animation.json";
import run from "#/sprites/run.png";

import { renderCanvas } from "#engine/render-canvas";
import { loadSprite } from "#engine/sprite-loader";

import type { Animations, AnimationEvents } from "#engine/game-object/types";

export * from "#engine/game-object/types";

const image = await loadSprite(run);

export class PersonObject extends GameObject {
  static override animations = {
    run: [image, new SpriteAnimation(runAnimation.sprites)],
  } satisfies Animations;

  declare readonly Animations: AnimationEvents<(typeof PersonObject)["animations"]>;
}

new PersonObject(renderCanvas).play("run");
