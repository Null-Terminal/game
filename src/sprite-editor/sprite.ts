import { cache } from "#/decorators/cache";
import { loadImage } from "#/image-loader";

import styles from "#sprite-editor/sprite/styles.css?raw";
import template from "#sprite-editor/sprite/template.html?raw";
import type { SpriteOptions } from "#sprite-editor/sprite/types";

import { SpriteResizer } from "#sprite-editor/sprite/resizer";
import { SpriteDragger } from "#sprite-editor/sprite/dragger";
import { ActionHandlers } from "#sprite-editor/sprite/actions";

export type { SpriteOptions };

export class Sprite extends HTMLElement {
  readonly file: File;
  readonly options: Required<SpriteOptions>;

  get host(): this {
    return this.shadowRoot!.host as this;
  }

  @cache
  get controls(): HTMLElement {
    return this.shadowRoot!.getElementById("controls") as HTMLElement;
  }

  @cache
  get sprite(): HTMLElement {
    return this.shadowRoot!.getElementById("sprite")!;
  }

  @cache
  get canvas(): HTMLCanvasElement {
    return this.shadowRoot!.getElementById("sprite-canvas") as HTMLCanvasElement;
  }

  @cache
  get ctx(): CanvasRenderingContext2D {
    return this.canvas.getContext("2d")!;
  }

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

  @cache
  get #xInput(): HTMLInputElement {
    return this.shadowRoot!.getElementById("x") as HTMLInputElement;
  }

  #y!: number;

  @cache
  get #yInput(): HTMLInputElement {
    return this.shadowRoot!.getElementById("y") as HTMLInputElement;
  }

  #spriteResizer!: SpriteResizer;
  #spriteDragger!: SpriteDragger;
  #actionHandlers!: ActionHandlers;

  constructor(file: File, opts: SpriteOptions) {
    super();

    this.attachShadow({ mode: "open" });

    this.file = file;

    this.options = {
      handleSize: 12,
      handlerColor: "#CCC",

      borderColor: "#00084B",
      backgroundColor: "#333",

      ...opts
    };
  }

  connectedCallback() {
    this.#render();

    this.x = this.canvas.width / 2;
    this.y = this.canvas.height / 2;

    loadImage(this.file).then((i) => {
      this.#image = i.image;
      this.#imageWidth = i.width;
      this.#imageHeight = i.height;
      this.draw();
    });
  }

  disconnectedCallback() {
    this.#spriteResizer.destroy();
    this.#spriteDragger.destroy();
    this.#actionHandlers.destroy();
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.draw();
  }

  draw(target = this.ctx) {
    target.fillStyle = this.options.backgroundColor;
    target.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.#image != null) {
      target.drawImage(
        this.#image,
        this.#x - this.imageWidth / 2,
        this.#y - this.imageHeight / 2,
        this.imageWidth,
        this.imageHeight
      );
    }

    if (target === this.ctx) {
      this.#drawGrid();
    }
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

  #render() {
    if (this.shadowRoot == null) {
      throw new Error("ShadowRoot element not found");
    }

    this.shadowRoot.innerHTML = `<style>${styles}</style>${template}`;

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

    this.#spriteResizer = new SpriteResizer(this);
    this.#spriteDragger = new SpriteDragger(this);
    this.#actionHandlers = new ActionHandlers(this);
  }
}

customElements.define("sprite-item", Sprite);
