import { SeededRandom } from "#/utils/seeded-random";
import { isInRange } from "#/utils/validators";

export interface FogStrip {
  image: ImageBitmap;
  top: number;
  sourceHeight: number;
}

export interface FogTextureOptions {
  // Число клубов на повторяющемся участке
  density: number;

  // Начало и конец плавного исчезновения в долях высоты полосы
  fade?: readonly [start: number, end: number];

  // Начальное значение генератора расположения клубов
  seed: number;
}

export class FogTexture {
  readonly options: Readonly<FogTextureOptions>;

  constructor(opts: FogTextureOptions) {
    const invalidDensity =
      !Number.isInteger(opts.density) || !isInRange(opts.density, 0, Infinity);

    const invalidFade = opts.fade != null && (
      !isInRange(opts.fade[0], 0, 1) ||
      !isInRange(opts.fade[1], 0, 1) ||
      opts.fade[0] >= opts.fade[1]
    );

    const hasInvalidOptions =
      invalidDensity || invalidFade || !Number.isFinite(opts.seed);

    if (hasInvalidOptions) {
      throw new RangeError("Fog texture options require nonnegative density, finite seed, and ascending fade range between 0 and 1");
    }

    const options: FogTextureOptions = { density: opts.density, seed: opts.seed };

    if (opts.fade != null) {
      options.fade = [opts.fade[0], opts.fade[1]];
    }

    this.options = options;
  }

  build(width: number, height: number): FogStrip {
    const { density, seed, fade } = this.options;

    const centerY = height / 2;
    const halfHeight = height / 2;

    // Клубы выходят за основную полосу максимум на 5% её полувысоты
    const top = Math.floor(centerY - halfHeight * 1.05) - 2;
    const bottom = Math.ceil(centerY + halfHeight * 1.05) + 2;

    const canvas = new OffscreenCanvas(width, Math.max(1, bottom - top));
    const ctx = canvas.getContext("2d")!;
    ctx.translate(0, -top);

    const band = ctx.createLinearGradient(0, centerY - halfHeight, 0, centerY + halfHeight);

    band.addColorStop(0, "rgba(89, 125, 161, 0)");
    band.addColorStop(0.5, "rgba(100, 136, 171, 0.38)");
    band.addColorStop(1, "rgba(89, 125, 161, 0)");

    ctx.fillStyle = band;
    ctx.fillRect(0, centerY - halfHeight, width, halfHeight * 2);

    const random = new SeededRandom(seed);

    // Повторяем крайние клубы с другой стороны тайла, чтобы не появлялся шов
    for (let i = 0; i < density; i++) {
      const x = random.next() * width;
      const y = centerY + (random.next() - 0.5) * halfHeight;

      const radiusX = 110 + random.next() * 190;
      const radiusY = halfHeight * (0.25 + random.next() * 0.3);

      for (let repeat = -1; repeat <= 1; repeat++) {
        ctx.save();
        ctx.translate(x + repeat * width, y);
        ctx.scale(radiusX, radiusY);

        const puff = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);

        puff.addColorStop(0, "rgba(135, 167, 194, 0.55)");
        puff.addColorStop(0.55, "rgba(114, 150, 181, 0.25)");
        puff.addColorStop(1, "rgba(92, 129, 163, 0)");

        ctx.fillStyle = puff;
        ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();
      }
    }

    if (fade != null) {
      const fadeGradient = ctx.createLinearGradient(0, height * fade[0], 0, height * fade[1]);

      fadeGradient.addColorStop(0, "#000");
      fadeGradient.addColorStop(1, "#0000");

      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = fadeGradient;
      ctx.fillRect(0, top, width, bottom - top);
    }

    return { image: canvas.transferToImageBitmap(), top, sourceHeight: height };
  }
}
