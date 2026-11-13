import type { AnimationInstance, ObjectRenderPayload } from "#engine/game-objects";
import { GameObjectRender } from "#engine/game-objects/game-object/render";
import type { DebugBounds } from "#engine/game-objects/game-object/debug";
import type { RenderContext } from "#engine/rendering";

import type { SkyObject } from "#game/background/sky-object";
import type { SkySceneOptions } from "#game/background/sky-object/types";

import { Clouds, type CloudStrip } from "#game/background/sky-object/clouds";
import { Dusk } from "#game/background/sky-object/dusk";
import { Lightning, type LightningBounds } from "#game/background/sky-object/lightning";
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
  #celestialScrollX = 0;
  #cloudScrollX = 0;

  #duskBuilder: Dusk | null = null;
  #starsBuilder: Stars | null = null;
  #cloudsBuilder: Clouds | null = null;
  #moonBuilder: Moon | null = null;
  #lightning: Lightning | null = null;
  #lightningBounds: LightningBounds | null = null;

  get lightningBounds(): LightningBounds | null {
    return this.#lightningBounds;
  }

  getMoonBounds(): DebugBounds | null {
    const moon = this.#moon;

    if (moon == null) {
      return null;
    }

    const { width, height } = this.go.canvas;
    const left = moon.left - this.#celestialScrollX;
    const top = moon.top;

    if (left >= width || left + moon.image.width <= 0 || top >= height || top + moon.image.height <= 0) {
      return null;
    }

    return {
      left: Math.max(0, left),
      top: Math.max(0, top),
      right: Math.min(width, left + moon.image.width),
      bottom: Math.min(height, top + moon.image.height)
    };
  }

  getCloudBounds(): { bounds: DebugBounds; index: number }[] {
    const clouds = this.#clouds;
    const scene = this.#scene?.clouds;

    if (clouds?.clusters == null || scene == null) {
      return [];
    }

    const { width, height } = this.go.canvas;
    const offset = ((this.#cloudScrollX % clouds.image.width) + clouds.image.width) % clouds.image.width;
    const visible: { bounds: DebugBounds; index: number }[] = [];

    for (let stripX = -offset; stripX < width; stripX += clouds.image.width) {
      for (const [index, cluster] of clouds.clusters.entries()) {
        const left = stripX + cluster.left;
        const right = stripX + cluster.right;

        if (right <= 0 || left >= width || cluster.bottom <= 0 || cluster.top >= height) {
          continue;
        }

        visible.push({
          bounds: {
            left: Math.max(0, left),
            top: Math.max(0, cluster.top),
            right: Math.min(width, right),
            bottom: Math.min(height, cluster.bottom)
          },
          index
        });
      }
    }

    return visible;
  }

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
    this.#lightningBounds = null;
    this.#celestialScrollX = 0;
    this.#cloudScrollX = 0;
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
    const collectBounds = this.go.options.debug != null && this.go.debug.enabled;

    if (this.#builtWidth !== width || this.#builtHeight !== height) {
      this.go.syncSize();
      this.#closeImages();

      // Широкая полоса реже повторяет звёзды и облака
      const stripWidth = Math.max(2048, width);
      this.#sky = this.#duskBuilder?.build(width, height) ?? null;
      this.#stars = this.#starsBuilder?.build(stripWidth, height) ?? null;
      this.#clouds = this.#cloudsBuilder?.build(stripWidth, height, collectBounds) ?? null;
      this.#moon = this.#moonBuilder?.build(width, height) ?? null;
      this.#lightning?.resize(width, height);
      this.#builtWidth = width;
      this.#builtHeight = height;
    }

    if (collectBounds && this.#clouds?.clusters == null && this.#cloudsBuilder != null) {
      this.#clouds?.image.close();
      this.#clouds = this.#cloudsBuilder.build(Math.max(2048, width), height, true);
    }

    if (this.#sky) {
      ctx.drawImage(this.#sky, 0, 0);
    }

    const celestialScrollX = Math.round(
      frame.getScrollOffsetX(this.go.options.celestialScrollFactor ?? 0)
    );
    this.#celestialScrollX = celestialScrollX;

    if (this.#stars) {
      this.#drawRepeatedStrip(ctx, this.#stars, celestialScrollX, width);
    }

    if (this.#moon) {
      const { image, left, top } = this.#moon;
      ctx.drawImage(image, left - celestialScrollX, top);
    }

    if (this.#clouds && this.#scene?.clouds) {
      const cloudScrollX = Math.round(
        frame.getScrollOffsetX(0.025) + elapsed / 1000 * this.#scene.clouds.speed
      );
      this.#cloudScrollX = cloudScrollX;
      this.#drawRepeatedStrip(ctx, this.#clouds.image, cloudScrollX, width, this.#clouds.top);
    }

    this.#lightningBounds = this.#lightning?.draw(ctx, elapsed, width, height, collectBounds) ?? null;

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
