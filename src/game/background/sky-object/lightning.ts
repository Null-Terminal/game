import { isInRange } from "#/utils/validators";
import { SeededRandom } from "#/utils/seeded-random";

export interface LightningOptions {
  // Задержка до первого разряда, интервал и длительность вспышки в миллисекундах
  initialDelay: number;
  interval: readonly [number, number];
  duration: readonly [number, number];

  // Сила вспышки от 0 до 1 и вероятность повторного импульса
  strength: readonly [number, number];
  doubleFlashChance: number;

  // Диапазон числа боковых ветвей
  branches: readonly [number, number];
  // Левая и правая границы появления в долях ширины экрана
  horizontalRange: readonly [number, number];

  // Начальное значение генератора случайных чисел
  seed: number;
}

export class Lightning {
  readonly options: Readonly<LightningOptions>;

  // Координаты узлов основного разряда: до 16 точек по два числа
  readonly #points = new Float32Array(32);

  #nextStrike: number;
  #strikeStartedAt = -Infinity;

  #duration = 0;
  #strength = 0;
  #doubleFlash = false;

  readonly #random: SeededRandom;
  #canvas: OffscreenCanvas | null = null;

  constructor(opts: LightningOptions) {
    const invalidTiming =
      !isInRange(opts.initialDelay, 0, Infinity) ||
      !Lightning.#validRange(opts.interval, 0, Infinity) ||
      !Lightning.#validRange(opts.duration, 166, Infinity);

    const invalidFlash =
      !Lightning.#validRange(opts.strength, 0, 1) ||
      !isInRange(opts.doubleFlashChance, 0, 1);

    const invalidShape =
      !Lightning.#validRange(opts.branches, 0, 8) ||
      !opts.branches.every(Number.isInteger) ||
      !Lightning.#validRange(opts.horizontalRange, 0, 1);

    const hasInvalidOptions =
      !Number.isFinite(opts.seed) || invalidTiming || invalidFlash || invalidShape;

    if (hasInvalidOptions) {
      throw new RangeError("Lightning options contain an invalid seed, delay, range, or probability");
    }

    this.options = {
      ...opts,
      interval: [opts.interval[0], opts.interval[1]],
      duration: [opts.duration[0], opts.duration[1]],
      strength: [opts.strength[0], opts.strength[1]],
      branches: [opts.branches[0], opts.branches[1]],
      horizontalRange: [opts.horizontalRange[0], opts.horizontalRange[1]]
    };

    this.#random = new SeededRandom(opts.seed);
    this.#nextStrike = opts.initialDelay;
  }

  reset() {
    this.#nextStrike = this.options.initialDelay;
    this.#strikeStartedAt = -Infinity;
    this.#random.reset(this.options.seed);
  }

  clear() {
    this.#canvas = null;
    this.reset();
  }

  resize(width: number, height: number) {
    this.#canvas = new OffscreenCanvas(width, height);
  }

  draw(ctx: CanvasRenderingContext2D, elapsed: number, width: number, height: number) {
    if (elapsed >= this.#nextStrike) {
      this.#startStrike(elapsed, width, height);
    }

    const age = elapsed - this.#strikeStartedAt;

    if (age < 0 || age >= this.#duration) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = this.#flashOpacity(age) * this.#strength;
    ctx.drawImage(this.#canvas!, 0, 0);
    ctx.restore();
  }

  #startStrike(elapsed: number, width: number, height: number) {
    const { interval, duration, strength, doubleFlashChance } = this.options;

    this.#strikeStartedAt = elapsed;
    this.#nextStrike = elapsed + interval[0] + this.#random.next() * (interval[1] - interval[0]);

    this.#duration = duration[0] + this.#random.next() * (duration[1] - duration[0]);
    this.#strength = strength[0] + this.#random.next() * (strength[1] - strength[0]);
    this.#doubleFlash = this.#random.next() < doubleFlashChance;

    this.#buildStrike(width, height);
  }

  #flashOpacity(age: number) {
    // Первая вспышка, короткая пауза и второй импульс заканчиваются через 55, 115 и 165 мс
    if (age < 55) {
      return 1;
    }

    if (this.#doubleFlash) {
      if (age < 115) {
        return 0.15;
      }

      if (age < 165) {
        return 0.7;
      }

      return 0.7 * (this.#duration - age) / (this.#duration - 165);
    }

    // Одиночная вспышка плавно угасает после первого импульса
    return 0.45 * (this.#duration - age) / (this.#duration - 55);
  }

  #buildStrike(width: number, height: number) {
    const ctx = this.#canvas!.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);

    const [left, right] = this.options.horizontalRange;

    const startX = width * (left + this.#random.next() * (right - left));
    const startY = -10 + this.#random.next() * height * 0.18;
    const endY = Math.min(height * (0.35 + this.#random.next() * 0.4), height - 100);

    const segments = 7 + Math.floor(this.#random.next() * 9);
    const lean = (this.#random.next() - 0.5) * Math.min(width * 0.3, 180);
    const jitter = 15 + this.#random.next() * 70;

    this.#drawGlow(ctx, width, height, startX + lean * 0.5, (startY + endY) * 0.5);

    let x = startX;

    ctx.beginPath();
    ctx.moveTo(x, startY);

    this.#points[0] = x;
    this.#points[1] = startY;

    // Количество колен, наклон и боковые отклонения меняются для каждого разряда
    for (let i = 1; i <= segments; i++) {
      x = Math.max(4, Math.min(width - 4, x + lean / segments + (this.#random.next() - 0.5) * jitter));
      const y = startY + (endY - startY) * i / segments;

      this.#points[i * 2] = x;
      this.#points[i * 2 + 1] = y;

      ctx.lineTo(x, y);
    }

    ctx.save();
    ctx.lineJoin = "miter";
    ctx.shadowColor = "#9CB8FF";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = "#879FE0";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#EEF5FF";
    ctx.lineWidth = 2;
    ctx.stroke();

    this.#drawBranches(ctx, segments);
    ctx.restore();
  }

  #drawGlow(ctx: OffscreenCanvasRenderingContext2D, width: number, height: number, x: number, y: number) {
    // Вспышка освещает всё небо, но ярче всего — область вокруг разряда
    const skyLight = ctx.createLinearGradient(0, 0, 0, height);

    skyLight.addColorStop(0, "rgba(195, 210, 255, 0.27)");
    skyLight.addColorStop(0.65, "rgba(170, 192, 245, 0.13)");
    skyLight.addColorStop(1, "rgba(150, 175, 235, 0)");

    ctx.fillStyle = skyLight;
    ctx.fillRect(0, 0, width, height);

    const radius = Math.max(width * 0.45, height * 0.6) * (0.8 + this.#random.next() * 0.5);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);

    glow.addColorStop(0, "rgba(185, 202, 255, 0.32)");
    glow.addColorStop(1, "rgba(185, 202, 255, 0)");

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  #drawBranches(ctx: OffscreenCanvasRenderingContext2D, segments: number) {
    // Число ветвей выбирается из заданного диапазона; каждая выходит из случайного узла
    const [minBranches, maxBranches] = this.options.branches;
    const count = minBranches + Math.floor(this.#random.next() * (maxBranches - minBranches + 1));

    ctx.shadowBlur = 8;
    ctx.lineWidth = 1;

    for (let i = 0; i < count; i++) {
      const point = 2 + Math.floor(this.#random.next() * (segments - 3));

      const x = this.#points[point * 2]!;
      const y = this.#points[point * 2 + 1]!;

      const direction = this.#random.next() < 0.5 ? -1 : 1;
      const length = 35 + this.#random.next() * 65;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + direction * length * 0.45, y + length * 0.35);
      ctx.lineTo(x + direction * length, y + length * 0.7);
      ctx.stroke();
    }
  }

  static #validRange(range: readonly [number, number], min: number, max: number) {
    return isInRange(range[0], min, max) && isInRange(range[1], min, max) && range[0] <= range[1];
  }
}
