import type { GameObjectDebugOptions } from "#engine/game-objects/types";

interface StretchTileBounds {
  x: number;
  y: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function drawDebugOutline(
  ctx: CanvasRenderingContext2D,
  outline: GameObjectDebugOptions["outline"],
  left: number,
  top: number,
  right: number,
  bottom: number
) {
  if (!outline || left >= right || top >= bottom) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = typeof outline === "string" ? outline : "#00FFFF";
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, right - left, bottom - top);
  ctx.restore();
}

export function drawDebugStretchSeams(
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
