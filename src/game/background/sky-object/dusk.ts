import { isInRange } from "#/utils/validators";

// Точка градиента: доля высоты от верхнего края (0–1) и CSS-цвет
export type DuskStop = readonly [heightFraction: number, color: string];

export interface DuskBand {
  // Верх и низ полосы в долях высоты неба
  readonly top: number;
  readonly bottom: number;

  readonly color: string;

  // Ширина ступени в пикселях
  readonly step: number;

  // Статический сдвиг волны между полосами
  readonly phase: number;
}

export interface DuskOptions {
  // Цвета градиента от верхнего края к нижнему
  gradient: readonly DuskStop[];

  // Ступенчатые полосы и их общая прозрачность
  bands: readonly DuskBand[];
  bandsOpacity: number;

  // Цветовой слой поверх градиента и полос
  overlay: string;
}

export class Dusk {
  readonly options: Readonly<DuskOptions>;

  constructor(opts: DuskOptions) {
    const hasInvalidGradient = opts.gradient.length === 0 || opts.gradient.some(([heightFraction, color], index) =>
      !isInRange(heightFraction, 0, 1) ||
      heightFraction < (opts.gradient[index - 1]?.[0] ?? 0) || color.length === 0
    );

    const hasInvalidBands = opts.bands.some(({ top, bottom, step, phase, color }) =>
      !isInRange(top, 0, 1) || !isInRange(bottom, 0, 1) || top >= bottom ||
      !Number.isFinite(step) || step <= 0 || !Number.isFinite(phase) || color.length === 0
    );

    if (hasInvalidGradient || hasInvalidBands || !isInRange(opts.bandsOpacity, 0, 1)) {
      throw new RangeError("Dusk options require valid gradient stops, bands, and opacity between 0 and 1");
    }

    this.options = {
      ...opts,
      gradient: opts.gradient.map(([heightFraction, color]) => [heightFraction, color]),
      bands: opts.bands.map(({ top, bottom, step, phase, color }) => ({ top, bottom, step, phase, color }))
    };
  }

  build(width: number, height: number): ImageBitmap {
    const { gradient, bands, bandsOpacity, overlay } = this.options;
    const sky = new OffscreenCanvas(width, height);

    const ctx = sky.getContext("2d")!;
    const colorGradient = ctx.createLinearGradient(0, 0, 0, height);

    for (const [heightFraction, color] of gradient) {
      colorGradient.addColorStop(heightFraction, color);
    }

    ctx.fillStyle = colorGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = bandsOpacity;

    for (const band of bands) {
      this.#drawBand(ctx, width, height, band);
    }

    ctx.restore();

    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, width, height);

    return sky.transferToImageBitmap();
  }

  #drawBand(ctx: OffscreenCanvasRenderingContext2D, width: number, height: number, band: DuskBand) {
    const { top, bottom, step, phase, color } = band;

    const pixelStep = height * 0.008;
    ctx.fillStyle = color;

    for (let column = 0, x = 0; x < width; column++, x += step) {
      // Синус слегка изгибает обе границы; у верхней амплитуда вчетверо меньше
      const wave = Math.sin(column * 0.27 + phase) * height * 0.025;

      // Округление к сетке в 0.8% высоты делает край ступенчатым
      const edge = Math.round((bottom * height + wave) / pixelStep) * pixelStep;
      const upper = Math.round((top * height + wave * 0.25) / pixelStep) * pixelStep;

      ctx.fillRect(x, upper, step, edge - upper);
    }
  }
}
