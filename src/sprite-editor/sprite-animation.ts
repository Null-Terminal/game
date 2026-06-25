import type { Sprite } from "#sprite-editor/sprite";

import { SpriteAnimation as Super, type AnimationParameters } from "#/sprite-animation";

export type * from "#/sprite-animation/types";

export interface MergedSprite {
  canvas: HTMLCanvasElement;
  animation: SpriteAnimation;
}

export class SpriteAnimation extends Super {
  static mergeSprites(sprites: Sprite[], params?: AnimationParameters): MergedSprite {
    // Максимальная ширина конечного спрайта
    const MAX_WIDTH = 2048;

    // Подготавливаем данные спрайтов с их размерами
    const items = sprites.map((sprite, index) => ({
      sprite,
      width: sprite.canvas.width,
      height: sprite.canvas.height,
      index
    }));

    items.sort((a, b) => b.height - a.height);

    interface Row {
      x: number;
      y: number;
      height: number;
      items: typeof items;
    }

    const rows: Row[] = [];

    let currentRow = { x: 0, y: 0, height: 0, items: [] as typeof items };

    for (const item of items) {
      // Если элемент не помещается в текущую строку - начинаем новую
      if (currentRow.x + item.width > MAX_WIDTH && currentRow.items.length > 0) {
        rows.push(currentRow);

        const y = currentRow.y + currentRow.height;
        currentRow = { x: 0, y, height: 0, items: [] };
      }

      currentRow.items.push(item);
      currentRow.x += item.width;
      currentRow.height = Math.max(currentRow.height, item.height);
    }

    if (currentRow.items.length > 0) {
      rows.push(currentRow);
    }

    // Вычисляем итоговые размеры атласа
    const totalHeight = rows.reduce((sum, row) => sum + row.height, 0);
    const totalWidth = Math.min(MAX_WIDTH, Math.max(...rows.map(r => r.x)));

    // Создаём результирующий canvas
    const resultCanvas = document.createElement("canvas");
    const resultCtx = resultCanvas.getContext("2d")!;

    resultCanvas.width = totalWidth;
    resultCanvas.height = totalHeight;

    const spriteDescriptors = new Array(sprites.length).fill(undefined);

    // Рисуем спрайты
    let currentY = 0;

    for (const row of rows) {
      let currentX = 0;

      for (const item of row.items) {
        const { width, height } = item;

        // Создаём временный canvas с чистым спрайтом
        const image = new OffscreenCanvas(width, height);
        item.sprite.draw(image.getContext("2d")!);
        resultCtx.drawImage(image, currentX, currentY);

        spriteDescriptors[item.index] = {
          x: currentX,
          y: currentY,
          width,
          height,
          duration: item.sprite.duration,
          spriteId: item.sprite.spriteId
        };

        currentX += width;
      }

      currentY += row.height;
    }

    return { canvas: resultCanvas, animation: new SpriteAnimation({ sprites: spriteDescriptors, params }) };
  }
}
