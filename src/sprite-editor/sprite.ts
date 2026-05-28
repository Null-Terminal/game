import { cache } from "#decorators/cache";
import { loadImage } from "#/file-loader";

import styles from "#sprite-editor/sprite/styles.css?raw";
import template from "#sprite-editor/sprite/template.html?raw";
import type { SpriteOptions, Context2D } from "#sprite-editor/sprite/types";

import { SpriteHistory } from "#sprite-editor/sprite/history";
import { SpriteResizer } from "#sprite-editor/sprite/resizer";
import { SpriteDragger } from "#sprite-editor/sprite/dragger";
import { ActionHandlers } from "#sprite-editor/sprite/actions";

export type { SpriteOptions };

export class Sprite extends HTMLElement {
  readonly file: File;
  readonly options: Required<SpriteOptions>;
  readonly history = new SpriteHistory(this);

  get host(): this {
    return this.shadowRoot!.host as this;
  }

  @cache
  get canvas(): HTMLCanvasElement {
    return this.shadowRoot!.getElementById("sprite-canvas") as HTMLCanvasElement;
  }

  @cache
  get ctx(): CanvasRenderingContext2D {
    return this.canvas.getContext("2d")!;
  }

  get image() {
    return this.#image;
  }

  get imageWidth() {
    return this.#imageWidth;
  }

  get imageHeight() {
    return this.#imageHeight;
  }

  get x() {
    return this.#x;
  }

  set x(value: number) {
    this.#x = value;
    this.#xInput.value = value.toFixed(0);
    this.redraw();
  }

  get y() {
    return this.#y;
  }

  set y(value: number) {
    this.#y = value;
    this.#yInput.value = value.toFixed(0);
    this.redraw();
  }

  get width() {
    return this.#width;
  }

  set width(value: number) {
    this.#width = value;
    this.#widthInput.value = value.toFixed(0);

    this.canvas.width = value;
    this.canvas.parentElement!.style.width = `${value}px`;

    this.redraw();
  }

  get height() {
    return this.#height;
  }

  set height(value: number) {
    this.#height = value;
    this.#heightInput.value = value.toFixed(0);

    this.canvas.height = value;
    this.canvas.parentElement!.style.height = `${value}px`;

    this.redraw();
  }

  get spriteId() {
    return this.#spriteId;
  }

  set spriteId(value: string) {
    this.#spriteId = value;
    this.#spriteIdInput.value = value;
  }

  get duration() {
    return this.#duration;
  }

  set duration(value: number) {
    this.#duration = value;
    this.#durationInput.value = value.toString();
  }

  @cache
  get controls(): HTMLElement {
    return this.shadowRoot!.getElementById("controls") as HTMLElement;
  }

  @cache
  get sprite(): HTMLElement {
    return this.shadowRoot!.getElementById("sprite")!;
  }

  #image: HTMLImageElement | null = null;
  #imageWidth = 0;
  #imageHeight = 0;

  #spriteId!: string;

  @cache
  get #spriteIdInput(): HTMLInputElement {
    return this.shadowRoot!.getElementById("spriteId") as HTMLInputElement;
  }

  @cache
  get #durationInput(): HTMLInputElement {
    return this.shadowRoot!.getElementById("duration") as HTMLInputElement;
  }

  #duration!: number;

  #x!: number;

  @cache
  get #xInput(): HTMLInputElement {
    return this.shadowRoot!.getElementById("x") as HTMLInputElement;
  }

  #y!: number;

  @cache
  get #yInput(): HTMLInputElement {
    return this.shadowRoot!.getElementById("y") as HTMLInputElement;
  }

  #width!: number;

  @cache
  get #widthInput(): HTMLInputElement {
    return this.shadowRoot!.getElementById("width") as HTMLInputElement;
  }

  #height!: number;

  @cache
  get #heightInput(): HTMLInputElement {
    return this.shadowRoot!.getElementById("height") as HTMLInputElement;
  }

  #spriteResizer!: SpriteResizer;
  #spriteDragger!: SpriteDragger;
  #actionHandlers!: ActionHandlers;

  #drawTask = 0;

  constructor(file: File, opts: SpriteOptions) {
    super();

    this.attachShadow({ mode: "open" });

    this.file = file;

    this.options = {
      x: 0,
      y: 0,

      spriteId: "",
      duration: 100,

      handleSize: 12,
      handlerColor: "#CCC",

      borderColor: "#00084B",
      backgroundColor: "#333",

      ...opts
    };
  }

  connectedCallback() {
    if (this.#image != null) {
      this.#initHandlers();
      return;
    }

    this.#render();

    loadImage(this.file).then((i) => {
      this.#image = i.image;
      this.#imageWidth = i.width;
      this.#imageHeight = i.height;
      this.redraw();
    });
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.#drawTask);
    this.#spriteResizer.destroy();
    this.#spriteDragger.destroy();
    this.#actionHandlers.destroy();
  }

  copy() {
    return new Sprite(this.file, {
      ...this.options,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      duration: this.duration
    });
  }

  resize(newWidth: number, newHeight: number) {
    const { width, height } = this;
    this.x -= Math.floor((width - newWidth) / 2);
    this.y -= Math.floor((height - newHeight) / 2);
    this.width = newWidth;
    this.height = newHeight;
  }

  redraw(target: Context2D = this.ctx) {
    cancelAnimationFrame(this.#drawTask);
    this.#drawTask = requestAnimationFrame(() => this.draw(target));
  }

  draw(target: Context2D = this.ctx) {
    target.fillStyle = this.options.backgroundColor;
    target.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.#image != null) {
      target.drawImage(
        this.#image,
        this.#x,
        this.#y,
        this.imageWidth,
        this.imageHeight
      );
    }

    if (target === this.ctx) {
      this.#drawGrid();
    }
  }

  trimSize() {
    const { width, height } = this;

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d")!;

    this.draw(ctx);

    // Получаем данные пикселей
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Находим границы содержимого
    let top = height;
    let bottom = 0;
    let left = width;
    let right = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!isBackgroundPixel(x, y)) {
          if (x < left) {
            left = x;
          }

          if (x > right) {
            right = x;
          }

          if (y < top) {
            top = y;
          }

          if (y > bottom) {
            bottom = y;
          }
        }
      }
    }

    // Если не нашли ни одного не-фонового пикселя
    if (left > right || top > bottom) {
      return;
    }

    // Вычисляем новую ширину и высоту
    const newWidth = right - left + 1;
    const newHeight = bottom - top + 1;

    this.x -= left;
    this.y -= top;
    this.width = newWidth;
    this.height = newHeight;

    function isBackgroundPixel(x: number, y: number) {
      const idx = (y * width + x) * 4;

      // Сравниваем с небольшим допуском (толерантностью) для отлова шумов
      const tolerance = 10;

      return Math.abs(data[idx]! - data[0]!) <= tolerance &&
        Math.abs(data[idx + 1]! - data[1]!) <= tolerance &&
        Math.abs(data[idx + 2]! - data[2]!) <= tolerance &&
        Math.abs(data[idx + 3]! - data[3]!) <= tolerance;
    }
  }

  override focus(opts?: FocusOptions) {
    this.canvas.focus(opts);
  }

  #drawGrid() {
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.options.borderColor;
    this.ctx.lineWidth = 1;

    const step = 50;

    for (let x = 0; x < this.canvas.width; x += step) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
    }

    for (let y = 0; y < this.canvas.height; y += step) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
    }

    this.ctx.stroke();
  }

  #initHandlers() {
    this.#spriteResizer = new SpriteResizer(this);
    this.#spriteDragger = new SpriteDragger(this);
    this.#actionHandlers = new ActionHandlers(this);
  }

  #render() {
    if (this.shadowRoot == null) {
      throw new Error(`${this.constructor.name}: ShadowRoot element not found`);
    }

    this.shadowRoot.innerHTML = `<style>${styles}</style>${template}`;

    this.x = this.options.x;
    this.y = this.options.y;

    this.width = this.options.width;
    this.height = this.options.height;

    this.spriteId = this.options.spriteId;
    this.duration = this.options.duration;

    this.history.save(false);

    Object.assign(this.canvas.style, {
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: this.options.borderColor,
      cursor: "grab",
    });

    this.#initHandlers();
  }
}

customElements.define("sprite-item", Sprite);
