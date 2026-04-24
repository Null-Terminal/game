import { cache } from "#decorators/cache";
import { SpriteAnimation } from "#/sprite-animation";

import runAnimation from "#/sprites/run.animation.json";
import run from "#/sprites/run.png";

import { renderCanvas, type RenderCanvas } from "#/engine/render-canvas";
import { loadSprite } from "#/engine/sprite-loader";

const image = await loadSprite(run);

export type GameObjectAnimations = Record<string, [HTMLCanvasElement, SpriteAnimation]>;

class GameObject {
  static animations: GameObjectAnimations = {
    run: [image, new SpriteAnimation(runAnimation.sprites)],
  };

  speed = 1;
  canvas: RenderCanvas;

  @cache
  get animations() {
    return (this.constructor as typeof GameObject).animations;
  }

  x = 0;
  y = 0;

  get width() {
    return this.#width;
  }

  get height() {
    return this.#height;
  }

  #width = 0;
  #height = 0;

  #paused = false;
  #cancelRedrawHandler: Function | null = null;

  constructor(canvas: RenderCanvas) {
    this.canvas = canvas;
  }

  destroy() {
    this.#cancelRedrawHandler?.();
  }

  isPaused() {
    return this.#paused;
  }

  pause() {
    this.#paused = true;
  }

  resume() {
    this.#paused = false;
  }

  play(animationName: string) {
    const selectedAnimation = this.animations[animationName];

    if (selectedAnimation == null) {
      throw new Error(`Animation ${animationName} not found`);
    }

    const [image, animation] = selectedAnimation;

    let lastFrameTime = 0;
    let spriteIndex = 0;

    this.#cancelRedrawHandler?.();

    this.#cancelRedrawHandler = this.canvas.requestRedrawHandler((now, ctx) => {
      const sprite = animation.at(spriteIndex)!;

      this.#width = sprite.width;
      this.#height = sprite.height;

      ctx.drawImage(
        image,
        sprite.x,
        sprite.y,
        sprite.width,
        sprite.height,
        this.x,
        this.y,
        sprite.width,
        sprite.height
      );

      if (!this.isPaused() && (now - lastFrameTime >= sprite.animationDelay / this.speed)) {
        spriteIndex = (spriteIndex + 1) % animation.length;
        lastFrameTime = now;
      }
    });
  }
}

new GameObject(renderCanvas).play("run");
