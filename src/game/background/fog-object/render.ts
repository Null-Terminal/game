import { GameObjectRender } from "#engine/game-objects/game-object/render";
import type { AnimationInstance, ObjectRenderPayload } from "#engine/game-objects";

import type { CanvasStrip } from "#game/background/canvas-strip";
import type { FogObject } from "#game/background/fog-object";
import { FogTexture } from "#game/background/fog-object/texture";
import type { FogAppearanceOptions } from "#game/background/fog-object/types";

export class FogObjectRender extends GameObjectRender<FogObject> {
  #texture: CanvasStrip | null = null;
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
    this.#texture = null;
    this.#builder = null;
    this.#appearance = null;
  }

  #drawFog(frame: ObjectRenderPayload) {
    const { ctx, elapsed } = frame;
    const { width: viewWidth, height: viewHeight } = this.go.canvas;

    const tileWidth = Math.max(2048, viewWidth);
    const bandHeight = this.go.height;

    if (this.#texture?.canvas.width !== tileWidth || this.#texture.sourceHeight !== bandHeight) {
      this.#texture = this.#builder!.build(tileWidth, bandHeight);
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
        cameraX + elapsed / 1000 * speed * 0.55 + texture.canvas.width / 3 - originX
      );

      this.#drawTiles(ctx, texture, slowerScroll, screenTop, viewWidth);
    }

    this.#drawTiles(ctx, texture, scroll, screenTop, viewWidth);
    ctx.restore();
  }

  #drawTiles(ctx: CanvasRenderingContext2D, texture: CanvasStrip, scroll: number, y: number, width: number) {
    const image = texture.canvas;
    const offset = ((scroll % image.width) + image.width) % image.width;

    for (let x = -offset; x < width; x += image.width) {
      ctx.drawImage(image, x, y + texture.top);
    }
  }
}
