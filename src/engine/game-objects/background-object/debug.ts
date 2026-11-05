import { GameObjectDebug } from "#engine/game-objects/game-object/debug";

import type { ObjectRenderPayload } from "#engine/game-objects/game-object";
import type { BackgroundObject } from "#engine/game-objects/background-object";

export interface RepeatCellBounds {
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
    cell: RepeatCellBounds,
    repeatX: boolean | undefined,
    repeatY: boolean | undefined
  ) {
    const vertical = repeatX && cell.x >= cell.left && cell.x < cell.right;
    const horizontal = repeatY && cell.y >= cell.top && cell.y < cell.bottom;

    if (!vertical && !horizontal) {
      return;
    }

    ctx.save();
    ctx.fillStyle = "#FF00FF";

    if (vertical) {
      ctx.fillRect(Math.round(cell.x), cell.top, 2, cell.bottom - cell.top);
    }

    if (horizontal) {
      ctx.fillRect(cell.left, Math.round(cell.y), cell.right - cell.left, 2);
    }

    ctx.restore();
  }
}
