import { isInRange } from "#/utils/validators";
import { SeededRandom } from "#/utils/seeded-random";

export interface StarsOptions {
  // Плотность звёзд на пиксель площади текстуры
  density: number;

  // Доля высоты неба, в которой могут появляться звёзды
  coverage: number;

  // Диапазон прозрачности от тусклой до яркой звезды
  minOpacity: number;
  maxOpacity: number;

  // Начальное значение генератора расположения звезд
  seed: number;
}

export class Stars {
  readonly options: Readonly<StarsOptions>;

  constructor(opts: StarsOptions) {
    const hasInvalidOptions =
      !Number.isFinite(opts.seed) ||
      !isInRange(opts.density, 0, Infinity) ||
      !isInRange(opts.coverage, 0, 1) ||
      !isInRange(opts.minOpacity, 0, 1) ||
      !isInRange(opts.maxOpacity, opts.minOpacity, 1);

    if (hasInvalidOptions) {
      throw new RangeError("Stars options must contain a finite seed, nonnegative density, and values between 0 and 1");
    }

    this.options = { ...opts };
  }

  build(width: number, height: number): ImageBitmap {
    const { seed, density, coverage, minOpacity, maxOpacity } = this.options;

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d")!;

    const random = new SeededRandom(seed);
    const count = Math.floor(width * height * density);

    for (let i = 0; i < count; i++) {
      const x = Math.floor(random.next() * (width - 1));
      const y = Math.floor(random.next() * height * coverage);
      const brightness = random.next();

      // Случайное значение выбирает прозрачность в заданном диапазоне; самые яркие 0.5% шире
      ctx.fillStyle = `rgba(222, 233, 255, ${minOpacity + brightness * (maxOpacity - minOpacity)})`;
      ctx.fillRect(x, y, brightness > 0.995 ? 2 : 1, 1);
    }

    return canvas.transferToImageBitmap();
  }
}
