import { cache } from "#decorators/cache";
import { loadImage } from "#/file-loader";

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

  get spriteId() {
    return this.#spriteId.value;
  }

  get animationDelay() {
    return parseFloat(this.#animationDelay.value);
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

  @cache
  get #spriteId(): HTMLInputElement {
    return this.shadowRoot!.getElementById("id") as HTMLInputElement;
  }

  @cache
  get #animationDelay(): HTMLInputElement {
    return this.shadowRoot!.getElementById("delay") as HTMLInputElement;
  }

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
      animationDelay: 100,

      handleSize: 12,
      handlerColor: "#CCC",

      borderColor: "#00084B",
      backgroundColor: "#333",

      ...opts
    };
  }

  connectedCallback() {
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

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  redraw(target = this.ctx) {
    cancelAnimationFrame(this.#drawTask);
    this.#drawTask = requestAnimationFrame(() => this.draw(target));
  }

  draw(target = this.ctx) {
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

  #render() {
    if (this.shadowRoot == null) {
      throw new Error("ShadowRoot element not found");
    }

    this.shadowRoot.innerHTML = `<style>${styles}</style>${template}`;

    this.x = this.options.x;
    this.y = this.options.y;

    this.width = this.options.width;
    this.height = this.options.height;

    this.#spriteId.value = this.options.spriteId.toString();
    this.#animationDelay.value = this.options.animationDelay.toString();

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
