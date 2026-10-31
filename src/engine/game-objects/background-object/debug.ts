import { GameObjectDebug } from "#engine/game-objects/game-object/debug";

import type { ObjectRenderPayload } from "#engine/game-objects/game-object";
import type { BackgroundObject } from "#engine/game-objects/background-object";

export interface StretchTileBounds {
  x: number;
  y: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export class BackgroundObjectDebug extends GameObjectDebug<BackgroundObject> {
  override draw(payload: ObjectRenderPayload) {
    const { go } = this;

    if (go.bbox == null) {
      super.draw(payload);
      return;
    }

    const bounds = go.render.getVisibleBounds(payload);

    if (bounds != null) {
      super.draw(payload, bounds);
    }
  }

  drawStretchSeams(
    ctx: CanvasRenderingContext2D,
    tile: StretchTileBounds,
    repeatX: boolean | undefined,
    repeatY: boolean | undefined
  ) {
    const vertical = repeatX && tile.x >= tile.left && tile.x < tile.right;
    const horizontal = repeatY && tile.y >= tile.top && tile.y < tile.bottom;

    if (!vertical && !horizontal) {
      return;
    }

    ctx.save();
    ctx.fillStyle = "#FF00FF";

    if (vertical) {
      ctx.fillRect(Math.round(tile.x), tile.top, 2, tile.bottom - tile.top);
    }

    if (horizontal) {
      ctx.fillRect(tile.left, Math.round(tile.y), tile.right - tile.left, 2);
    }

    ctx.restore();
  }
}
