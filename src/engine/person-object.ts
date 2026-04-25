import { GameObject } from "#engine/game-object";

import { SpriteAnimation } from "#/sprite-animation";
import { EventEmitter } from "#/event-emitter";

import runAnimation from "#/sprites/run.animation.json";
import run from "#/sprites/run.png";

import { renderCanvas } from "#engine/render-canvas";
import { loadSprite } from "#engine/sprite-loader";

import type { GameObjectAnimations } from "#engine/game-object/types";

export * from "#engine/game-object/types";

const image = await loadSprite(run);

export class PersonObject extends GameObject {
  static override animations: GameObjectAnimations = {
    run: [image, new SpriteAnimation(runAnimation.sprites)],
  };

  override readonly emitter = new EventEmitter({});
}

new PersonObject(renderCanvas).play("run");
