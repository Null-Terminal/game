import { isInRange } from "#/utils/validators";
import { SeededRandom } from "#/utils/seeded-random";
import type { CanvasStrip } from "#game/background/canvas-strip";

export interface CloudsOptions {
  // Число групп и силуэтов внутри каждой группы
  clusters: number;
  density: number;

  // Прозрачность готовой текстуры от 0 до 1
  opacity: number;

  // Начальное значение генератора расположения облаков
  seed: number;
}

export class Clouds {
  readonly options: Readonly<CloudsOptions>;

  constructor(opts: CloudsOptions) {
    const hasInvalidOptions =
      !Number.isFinite(opts.seed) ||
      !Number.isInteger(opts.clusters) || !isInRange(opts.clusters, 0, Infinity) ||
      !Number.isInteger(opts.density) || !isInRange(opts.density, 0, Infinity) ||
      !isInRange(opts.opacity, 0, 1);

    if (hasInvalidOptions) {
      throw new RangeError("Clouds options require a finite seed, nonnegative integer counts, and opacity between 0 and 1");
    }

    this.options = { ...opts };
  }

  build(width: number, height: number): CanvasStrip {
    const { seed, clusters, density, opacity } = this.options;

    // Запас вокруг полосы учитывает высоту силуэтов и их случайный сдвиг
    const stripTop = Math.max(0, Math.floor(height * 0.09 - 24));
    const stripBottom = Math.min(height, Math.ceil(height * 0.48 + 76));

    const canvas = new OffscreenCanvas(width, Math.max(1, stripBottom - stripTop));
    const ctx = canvas.getContext("2d")!;

    ctx.translate(0, -stripTop);

    const random = new SeededRandom(seed);
    const columnWidth = 8;

    ctx.globalAlpha = opacity;

    for (let group = 0; group < clusters; group++) {
      // Группа занимает 240–420 пикселей в ширину и лежит в верхних 9–48% неба
      const groupWidth = 240 + random.next() * 180;
      const groupX = random.next() * (width - groupWidth);
      const groupY = height * (0.09 + random.next() * 0.39);

      ctx.fillStyle = group % 3 === 0 ? "#8E63854D" : "#25244166";

      for (let puff = 0; puff < density; puff++) {
        const cloudWidth = 100 + random.next() * 120;
        const cloudHeight = 28 + random.next() * 32;

        const x = groupX + random.next() * (groupWidth - cloudWidth);
        const y = groupY + (random.next() - 0.5) * 30;

        // Полосы по 8 пикселей дают ступенчатый край силуэта
        const columns = Math.ceil(cloudWidth / columnWidth);

        for (let column = 0; column < columns; column++) {
          // Синус утолщает середину, а шум ломает симметрию кромок
          const middle = Math.sin(Math.PI * (column + 0.5) / columns);
          const roughness = (random.next() - 0.5) * 0.12;

          const shapeTop = y + cloudHeight * (0.45 - middle * 0.45 + roughness);
          const shapeBottom = y + cloudHeight * (0.45 + middle * 0.4 + roughness);

          // Верх выравниваем по сетке 4 пикселя, а высоту не даём уменьшить ниже 4
          ctx.fillRect(
            x + column * columnWidth,
            Math.round(shapeTop / 4) * 4,
            columnWidth,
            Math.max(4, shapeBottom - shapeTop)
          );
        }
      }
    }

    return { canvas, top: stripTop, sourceHeight: height };
  }
}
