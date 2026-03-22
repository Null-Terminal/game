import { SpriteResizer } from "#sprite-editor/sprite/resizer";
import { SpriteDragger } from "#sprite-editor/sprite/dragger";
import { loadImage } from "#sprite-editor/sprite/image-loader";

export interface SpriteOptions {
  handleSize?: number;
  handlerColor?: string;

  borderColor?: string;
  backgroundColor?: string;

  width: number;
  height: number;
}

export class Sprite {
  readonly container: HTMLDivElement = Object.assign(document.createElement("div"), {
    className: "sprite",
  });

  readonly options: Required<SpriteOptions>;
  readonly canvas: HTMLCanvasElement = document.createElement("canvas");
  readonly ctx: CanvasRenderingContext2D;

  get x() {
    return this.#x;
  }

  set x(value: number) {
    this.#x = value;
    this.#xInput.value = value.toFixed(1);
  }

  get y() {
    return this.#y;
  }

  set y(value: number) {
    this.#y = value;
    this.#yInput.value = value.toFixed(1);
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

  #image: HTMLImageElement | null = null;
  #imageWidth = 0;
  #imageHeight = 0;

  #x!: number;
  #xInput!: HTMLInputElement;

  #y!: number;
  #yInput!: HTMLInputElement;

  constructor(file: File, opts: SpriteOptions) {
    this.options = {
      handleSize: 12,
      handlerColor: "#CCC",

      borderColor: "#444",
      backgroundColor: "#333",

      ...opts
    };

    this.#initTemplate();

    const ctx = this.canvas.getContext("2d");

    if (ctx == null) {
      throw new Error("Cannot get 2D context from canvas");
    }

    this.ctx = ctx;

    this.x = this.canvas.width / 2;
    this.y = this.canvas.height / 2;

    loadImage(file).then((i) => {
      this.#image = i.image;
      this.#imageWidth = i.width;
      this.#imageHeight = i.height;
      this.draw();
    });
  }

  draw(): void {
    this.#drawGrid();

    if (this.#image != null) {
      this.ctx.drawImage(
        this.#image,
        this.#x - this.imageWidth / 2,
        this.#y - this.imageHeight / 2,
        this.imageWidth,
        this.imageHeight
      );
    }
  }

  #drawGrid(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

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

  #initTemplate() {
    Object.assign(this.canvas, {
      height: this.options.height,
      width: this.options.width
    });

    Object.assign(this.canvas.style, {
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: this.options.borderColor,
      cursor: "grab",
    });

    this.container.insertAdjacentHTML("afterbegin",`
      <div class="image-coords">
        <label>
          X
          <input class="image-coord x">
        </label>

        <label>
          Y
          <input class="image-coord y">
        </label>
      </div>
    `);

    this.container.append(this.canvas);

    this.#xInput = this.container.querySelector(".x")!;
    this.#yInput = this.container.querySelector(".y")!;

    new SpriteResizer(this);
    new SpriteDragger(this);
  }

  #loadImage(file: File): void {
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result;

      if (typeof result !== "string") {
        console.error("Failed to read file");
        return;
      }

      const img = new Image();

      img.onload = () => {
        this.#image = img;

        this.#imageWidth = img.width;
        this.#imageHeight = img.height;

        this.draw();
      };

      img.onerror = () => {
        console.error("Failed to load image");
      };

      img.src = result;
    };

    reader.onerror = () => {
      console.error("Failed to read file");
    };

    reader.readAsDataURL(file);
  }
}
