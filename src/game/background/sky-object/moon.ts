import { isInRange } from "#/utils/validators";
import { SeededRandom } from "#/utils/seeded-random";

export interface MoonOptions {
  // Центр луны в долях ширины и высоты экрана
  position: readonly [x: number, y: number];
  radius: number;

  color: string;
  opacity: number;

  // Размер и сила мягкого свечения вокруг диска
  haloRadius: number;
  haloOpacity: number;
  haloColor: string;

  // Начальное значение генератора рисунка кратеров
  seed: number;
}

export interface MoonTexture {
  canvas: OffscreenCanvas;
  left: number;
  top: number;
}

export class Moon {
  readonly options: Readonly<MoonOptions>;

  constructor(opts: MoonOptions) {
    const invalidPosition = opts.position.some((value) => !isInRange(value, 0, 1));

    const invalidDisc =
      !Number.isFinite(opts.radius) || opts.radius <= 0 ||
      !isInRange(opts.opacity, 0, 1) ||
      opts.color.length === 0;

    const invalidHalo =
      !isInRange(opts.haloRadius, opts.radius, Infinity) ||
      !isInRange(opts.haloOpacity, 0, 1) ||
      opts.haloColor.length === 0;

    const hasInvalidOptions =
      invalidPosition || invalidDisc || invalidHalo || !Number.isFinite(opts.seed);

    if (hasInvalidOptions) {
      throw new RangeError("Moon options require a position between 0 and 1, a positive radius, valid colors, a halo radius at least as large as the moon, opacity between 0 and 1, and a finite seed");
    }

    this.options = {
      ...opts,
      position: [opts.position[0], opts.position[1]]
    };
  }

  build(viewWidth: number, viewHeight: number): MoonTexture {
    const { position, radius, opacity, color, haloRadius, haloOpacity, haloColor, seed } = this.options;

    const size = Math.ceil(haloRadius * 2);
    const center = size / 2;

    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d")!;
    ctx.globalAlpha = opacity * haloOpacity;

    const halo = ctx.createRadialGradient(center, center, radius * 0.6, center, center, haloRadius);
    halo.addColorStop(0, haloColor);
    halo.addColorStop(1, "#0000");

    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);

    ctx.globalAlpha = opacity;
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = color;
    ctx.fillRect(center - radius, center - radius, radius * 2, radius * 2);

    const shade = ctx.createRadialGradient(center - radius * 0.3, center - radius * 0.3, 0, center, center, radius);
    shade.addColorStop(0, "rgba(255, 255, 255, 0.1)");
    shade.addColorStop(0.7, "rgba(55, 49, 62, 0.12)");
    shade.addColorStop(1, "rgba(55, 49, 62, 0.42)");
    ctx.fillStyle = shade;
    ctx.fillRect(center - radius, center - radius, radius * 2, radius * 2);

    const random = new SeededRandom(seed);
    ctx.fillStyle = "rgba(104, 85, 65, 0.14)";

    // Неровные пятна не дают диску выглядеть идеально гладким
    for (let i = 0; i < 12; i++) {
      const x = center + (random.next() - 0.5) * radius * 1.7;
      const y = center + (random.next() - 0.5) * radius * 1.7;
      const crater = radius * (0.05 + random.next() * 0.12);
      ctx.beginPath();
      ctx.ellipse(x, y, crater, crater * (0.65 + random.next() * 0.5), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    return {
      canvas,
      left: Math.round(viewWidth * position[0] - center),
      top: Math.round(viewHeight * position[1] - center)
    };
  }
}
