import type { AnimationInstance, ObjectRenderPayload } from "#engine/game-objects";
import { GameObjectRender } from "#engine/game-objects/game-object/render";
import type { RenderContext } from "#engine/rendering";

import type { SkyObject } from "#game/background/sky-object";
import type { SkySceneOptions } from "#game/background/sky-object/types";

import { Clouds, type CloudStrip } from "#game/background/sky-object/clouds";
import { Dusk } from "#game/background/sky-object/dusk";
import { Lightning } from "#game/background/sky-object/lightning";
import { Moon, type MoonTexture } from "#game/background/sky-object/moon";
import { Stars } from "#game/background/sky-object/stars";

export class SkyObjectRender extends GameObjectRender<SkyObject> {
  #builtWidth = -1;
  #builtHeight = -1;

  #sky: ImageBitmap | null = null;
  #stars: ImageBitmap | null = null;
  #clouds: CloudStrip | null = null;

  #moon: MoonTexture | null = null;
  #scene: SkySceneOptions | null = null;

  #duskBuilder: Dusk | null = null;
  #starsBuilder: Stars | null = null;
  #cloudsBuilder: Clouds | null = null;
  #moonBuilder: Moon | null = null;
  #lightning: Lightning | null = null;

  createPlayback(scene: SkySceneOptions): AnimationInstance {
    const duskBuilder = scene.dusk ? new Dusk(scene.dusk) : null;
    const starsBuilder = scene.stars ? new Stars(scene.stars) : null;
    const cloudsBuilder = scene.clouds ? new Clouds(scene.clouds) : null;
    const moonBuilder = scene.moon ? new Moon(scene.moon) : null;
    const lightning = scene.lightning ? new Lightning(scene.lightning) : null;

    this.#scene = scene;
    this.#duskBuilder = duskBuilder;
    this.#starsBuilder = starsBuilder;
    this.#cloudsBuilder = cloudsBuilder;
    this.#moonBuilder = moonBuilder;
    this.#lightning = lightning;

    return {
      draw: (frame) => this.#drawSky(frame),
      destroy: () => this.#clearTextures()
    };
  }

  #clearTextures() {
    this.#builtWidth = -1;
    this.#builtHeight = -1;
    this.#closeImages();
    this.#scene = null;
    this.#duskBuilder = null;
    this.#starsBuilder = null;
    this.#cloudsBuilder = null;
    this.#moonBuilder = null;
    this.#lightning?.clear();
    this.#lightning = null;
  }

  #closeImages() {
    this.#sky?.close();
    this.#stars?.close();
    this.#clouds?.image.close();
    this.#moon?.image.close();

    this.#sky = null;
    this.#stars = null;
    this.#clouds = null;
    this.#moon = null;
  }

  #drawSky(frame: ObjectRenderPayload) {
    const { ctx, elapsed } = frame;
    const { width, height } = this.go.canvas;

    if (this.#builtWidth !== width || this.#builtHeight !== height) {
      this.go.syncSize();
      this.#closeImages();

      // Широкая полоса реже повторяет звёзды и облака
      const stripWidth = Math.max(2048, width);
      this.#sky = this.#duskBuilder?.build(width, height) ?? null;
      this.#stars = this.#starsBuilder?.build(stripWidth, height) ?? null;
      this.#clouds = this.#cloudsBuilder?.build(stripWidth, height) ?? null;
      this.#moon = this.#moonBuilder?.build(width, height) ?? null;
      this.#lightning?.resize(width, height);
      this.#builtWidth = width;
      this.#builtHeight = height;
    }

    if (this.#sky) {
      ctx.drawImage(this.#sky, 0, 0);
    }

    const celestialScrollX = Math.round(
      frame.getScrollOffsetX(this.go.options.celestialScrollFactor ?? 0)
    );

    if (this.#stars) {
      this.#drawRepeatedStrip(ctx, this.#stars, celestialScrollX, width);
    }

    if (this.#moon) {
      const { image, left, top } = this.#moon;
      ctx.drawImage(image, left - celestialScrollX, top);
    }

    if (this.#clouds && this.#scene?.clouds) {
      const cloudScrollX = frame.getScrollOffsetX(0.025) + elapsed / 1000 * this.#scene.clouds.speed;
      this.#drawRepeatedStrip(ctx, this.#clouds.image, Math.round(cloudScrollX), width, this.#clouds.top);
    }

    this.#lightning?.draw(ctx, elapsed, width, height);

    // Тёмный силуэт следует за камерой по вертикали
    const groundLine = Math.round(height - 140 + frame.getScrollOffsetY());

    if (groundLine < height) {
      ctx.fillStyle = "#111A2B";
      ctx.fillRect(0, Math.max(0, groundLine), width, height - groundLine);
    }
  }

  #drawRepeatedStrip(ctx: RenderContext, image: ImageBitmap, scroll: number, width: number, y = 0) {
    // Нормализуем сдвиг в пределах ширины текстуры, включая отрицательный скролл
    const offset = ((scroll % image.width) + image.width) % image.width;

    for (let x = -offset; x < width; x += image.width) {
      ctx.drawImage(image, x, y);
    }
  }
}
