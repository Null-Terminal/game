import type { AnimationInstance, ObjectRenderPayload } from "#engine/game-objects";
import { GameObjectRender } from "#engine/game-objects/game-object/render";
import type { RenderContext } from "#engine/rendering";

import type { FogObject } from "#game/background/fog-object";
import type { FogAppearanceOptions } from "#game/background/fog-object/types";

import { FogTexture, type FogStrip } from "#game/background/fog-object/texture";

export class FogObjectRender extends GameObjectRender<FogObject> {
  #texture: FogStrip | null = null;
  #builder: FogTexture | null = null;
  #appearance: FogAppearanceOptions | null = null;

  createPlayback(appearance: FogAppearanceOptions): AnimationInstance {
    this.#builder = new FogTexture(appearance.texture);
    this.#appearance = appearance;

    return {
      draw: (frame) => this.#drawFog(frame),
      destroy: () => this.#clearTexture()
    };
  }

  #clearTexture() {
    this.#texture?.image.close();
    this.#texture = null;
    this.#builder = null;
    this.#appearance = null;
  }

  #drawFog(frame: ObjectRenderPayload) {
    const { ctx, elapsed } = frame;
    const { width: viewWidth, height: viewHeight } = this.go.canvas;

    const stripWidth = Math.max(2048, viewWidth);
    const bandHeight = this.go.height;

    if (this.#texture?.image.width !== stripWidth || this.#texture.sourceHeight !== bandHeight) {
      this.#texture?.image.close();
      this.#texture = this.#builder!.build(stripWidth, bandHeight);
    }

    const texture = this.#texture;
    const { opacity, speed, sway = 0, flow = false } = this.#appearance!;
    const { scrollFactor, bbox } = this.go.options;

    const factorX = scrollFactor?.[0] ?? 0.1;
    const factorY = scrollFactor?.[1] ?? scrollFactor?.[0] ?? 1;
    const cameraX = frame.getScrollOffsetX(factorX);

    const swayY = Math.sin(elapsed / 3500) * sway;
    const screenTop = Math.round(
      viewHeight - this.go.y - bandHeight + frame.getScrollOffsetY(factorY) + swayY
    );

    const originX = Number.isFinite(this.go.x) ? this.go.x : 0;
    const scroll = Math.round(cameraX + elapsed / 1000 * speed - originX);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity * (flow ? 0.7 : 1)));

    const [minX, , maxX] = bbox;
    if (Number.isFinite(minX) || Number.isFinite(maxX)) {
      const left = Math.max(0, minX - cameraX);
      const right = Math.min(viewWidth, maxX - cameraX);

      if (left >= right) {
        ctx.restore();
        return;
      }

      ctx.beginPath();
      ctx.rect(left, 0, right - left, viewHeight);
      ctx.clip();
    }

    if (flow) {
      const slowerScroll = Math.round(
        cameraX + elapsed / 1000 * speed * 0.55 + texture.image.width / 3 - originX
      );

      this.#drawRepeatedStrip(ctx, texture, slowerScroll, screenTop, viewWidth);
    }

    this.#drawRepeatedStrip(ctx, texture, scroll, screenTop, viewWidth);
    ctx.restore();
  }

  #drawRepeatedStrip(ctx: RenderContext, texture: FogStrip, scroll: number, y: number, width: number) {
    const image = texture.image;
    const offset = ((scroll % image.width) + image.width) % image.width;

    for (let x = -offset; x < width; x += image.width) {
      ctx.drawImage(image, x, y + texture.top);
    }
  }
}
