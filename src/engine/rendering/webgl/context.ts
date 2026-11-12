import { CanvasRasterCache } from "#engine/rendering/webgl/raster-cache";
import { createWebGLProgram, type Uniforms } from "#engine/rendering/webgl/program";
import { WebGLTextureCache } from "#engine/rendering/webgl/texture-cache";
import type { ContextState, Matrix, Rect, RGBAColor } from "#engine/rendering/webgl/types";

export class WebGLUnavailableError extends Error {}

export class WebGLCanvasContext {
  readonly canvas: HTMLCanvasElement;

  globalAlpha = 1;
  fillStyle = "#000000";
  strokeStyle = "#000000";
  lineWidth = 1;
  font = "10px sans-serif";
  imageSmoothingEnabled = true;

  readonly #gl: WebGL2RenderingContext;
  #program!: WebGLProgram;
  #buffer!: WebGLBuffer;
  #uniforms!: Uniforms;
  #lost = false;

  readonly #textures: WebGLTextureCache;
  readonly #raster: CanvasRasterCache;

  #transform: Matrix = [1, 0, 0, 1, 0, 0];

  #clip: Rect | null = null;
  #path: Rect | null = null;
  #stack: ContextState[] = [];

  #width = 0;
  #height = 0;

  readonly #appliedSource = { x: NaN, y: NaN, width: NaN, height: NaN };
  readonly #appliedColor = { red: NaN, green: NaN, blue: NaN, alpha: NaN };

  #appliedTransform: Matrix | null = null;
  #appliedSolid: boolean | null = null;
  #appliedClip: Rect | null | undefined = undefined;

  get textureStats() {
    return this.#textures.stats;
  }

  readonly #onContextLost = (event: Event) => {
    event.preventDefault();
    this.#lost = true;
    this.#textures.invalidate();
  };

  readonly #onContextRestored = () => {
    this.#initialize();
    this.#lost = false;
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, premultipliedAlpha: true });

    if (gl == null) {
      throw new WebGLUnavailableError("WebGL2 is unavailable");
    }

    this.#gl = gl;
    this.#textures = new WebGLTextureCache(gl);
    this.#raster = new CanvasRasterCache((image) => this.#textures.release(image));
    this.#initialize();

    canvas.addEventListener("webglcontextlost", this.#onContextLost);
    canvas.addEventListener("webglcontextrestored", this.#onContextRestored);
  }

  save() {
    this.#stack.push({
      transform: this.#transform,
      clip: this.#clip,
      alpha: this.globalAlpha,
      fill: this.fillStyle,
      stroke: this.strokeStyle,
      lineWidth: this.lineWidth,
      font: this.font,
      smoothing: this.imageSmoothingEnabled
    });
  }

  restore() {
    const state = this.#stack.pop();

    if (state == null) {
      return;
    }

    this.#transform = state.transform;
    this.#clip = state.clip;
    this.globalAlpha = state.alpha;
    this.fillStyle = state.fill;
    this.strokeStyle = state.stroke;
    this.lineWidth = state.lineWidth;
    this.font = state.font;
    this.imageSmoothingEnabled = state.smoothing;
  }

  beginPath() {
    this.#path = null;
  }

  rect(x: number, y: number, width: number, height: number) {
    const [a, b, c, d, e, f] = this.#transform;
    const left = Math.min(a * x + c * y + e, a * (x + width) + c * (y + height) + e);
    const right = Math.max(a * x + c * y + e, a * (x + width) + c * (y + height) + e);
    const top = Math.min(b * x + d * y + f, b * (x + width) + d * (y + height) + f);
    const bottom = Math.max(b * x + d * y + f, b * (x + width) + d * (y + height) + f);
    this.#path = [left, top, right - left, bottom - top];
  }

  clip() {
    const path = this.#path;

    if (path == null) {
      return;
    }

    if (this.#clip == null) {
      this.#clip = path;
      return;
    }

    const left = Math.max(this.#clip[0], path[0]);
    const top = Math.max(this.#clip[1], path[1]);
    const right = Math.min(this.#clip[0] + this.#clip[2], path[0] + path[2]);
    const bottom = Math.min(this.#clip[1] + this.#clip[3], path[1] + path[3]);

    this.#clip = [left, top, Math.max(0, right - left), Math.max(0, bottom - top)];
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number) {
    this.#transform = [a, b, c, d, e, f];
  }

  fillRect(x: number, y: number, width: number, height: number) {
    const gl = this.#gl;

    if (this.#lost) {
      return;
    }

    const color = this.#raster.color(this.fillStyle);

    if (this.#canClearCanvas(x, y, width, height)) {
      const [red, green, blue, alpha] = color;

      this.#resize();
      gl.disable(gl.SCISSOR_TEST);
      gl.clearColor(red * alpha, green * alpha, blue * alpha, alpha);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }

    this.#drawSolid(x, y, width, height, color);
  }

  strokeRect(x: number, y: number, width: number, height: number) {
    const fill = this.fillStyle;
    this.fillStyle = this.strokeStyle;
    this.fillRect(x, y, width, this.lineWidth);
    this.fillRect(x, y + height - this.lineWidth, width, this.lineWidth);
    this.fillRect(x, y, this.lineWidth, height);
    this.fillRect(x + width - this.lineWidth, y, this.lineWidth, height);
    this.fillStyle = fill;
  }

  drawImage(image: ImageBitmap, x: number, y: number): void;
  drawImage(image: ImageBitmap, x: number, y: number, width: number, height: number): void;
  drawImage(image: ImageBitmap, sx: number, sy: number, sw: number, sh: number, x: number, y: number, width: number, height: number): void;
  drawImage(
    image: ImageBitmap,
    x: number,
    y: number,
    width?: number,
    height?: number,
    destinationX?: number,
    destinationY?: number,
    destinationWidth?: number,
    destinationHeight?: number
  ) {
    if (destinationX != null) {
      this.#drawImage(
        image,
        destinationX, destinationY!, destinationWidth!, destinationHeight!,
        x / image.width, y / image.height, width! / image.width, height! / image.height
      );

      return;
    }

    this.#drawImage(image, x, y, width ?? image.width, height ?? image.height);
  }

  measureText(text: string): TextMetrics {
    return this.#raster.measureText(text, this.font);
  }

  fillText(text: string, x: number, y: number) {
    const { image, ascent } = this.#raster.textImage(text, this.font, this.fillStyle);
    this.drawImage(image, x - 1, y - ascent - 1);
  }

  destroy() {
    this.canvas.removeEventListener("webglcontextlost", this.#onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.#onContextRestored);
    this.#raster.destroy();
    this.#textures.clear();
    this.#gl.deleteProgram(this.#program);
    this.#gl.deleteBuffer(this.#buffer);
  }

  clearTextures() {
    this.#textures.clear();
  }

  #initialize() {
    const { program, buffer, uniforms } = createWebGLProgram(this.#gl);

    this.#program = program;
    this.#buffer = buffer;
    this.#uniforms = uniforms;

    this.#width = 0;
    this.#height = 0;

    this.#appliedTransform = null;
    this.#appliedSource.x = NaN;
    this.#appliedColor.red = NaN;
    this.#appliedSolid = null;
    this.#appliedClip = undefined;

    this.#textures.invalidate();
  }

  #drawImage(
    image: ImageBitmap,
    x: number,
    y: number,
    width: number,
    height: number,
    sourceX = 0,
    sourceY = 0,
    sourceWidth = 1,
    sourceHeight = 1
  ) {
    if (!this.#prepareQuad(x, y, width, height)) {
      return;
    }

    const gl = this.#gl;
    const alpha = this.globalAlpha;

    this.#setSource(sourceX, sourceY, sourceWidth, sourceHeight);
    this.#setColor(alpha, alpha, alpha, alpha);
    this.#setSolid(false);
    this.#textures.bind(image, this.imageSmoothingEnabled);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  #drawSolid(x: number, y: number, width: number, height: number, color: RGBAColor) {
    if (!this.#prepareQuad(x, y, width, height)) {
      return;
    }

    const gl = this.#gl;

    const [red, green, blue, alpha] = color;
    const opacity = alpha * this.globalAlpha;

    this.#setColor(red * opacity, green * opacity, blue * opacity, opacity);
    this.#setSolid(true);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  #prepareQuad(x: number, y: number, width: number, height: number): boolean {
    if (this.#lost || width <= 0 || height <= 0) {
      return false;
    }

    const gl = this.#gl;

    this.#resize();
    this.#applyClip();

    gl.uniform4f(this.#uniforms.rect, x, y, width, height);

    if (this.#appliedTransform !== this.#transform) {
      const [a, b, c, d, e, f] = this.#transform;

      gl.uniformMatrix3fv(this.#uniforms.transform, false, [a, b, 0, c, d, 0, e, f, 1]);
      this.#appliedTransform = this.#transform;
    }

    return true;
  }

  #setSource(x: number, y: number, width: number, height: number) {
    const source = this.#appliedSource;

    if (source.x === x && source.y === y && source.width === width && source.height === height) {
      return;
    }

    this.#gl.uniform4f(this.#uniforms.source, x, y, width, height);
    source.x = x;
    source.y = y;
    source.width = width;
    source.height = height;
  }

  #setColor(red: number, green: number, blue: number, alpha: number) {
    const color = this.#appliedColor;

    if (color.red === red && color.green === green && color.blue === blue && color.alpha === alpha) {
      return;
    }

    this.#gl.uniform4f(this.#uniforms.color, red, green, blue, alpha);
    color.red = red;
    color.green = green;
    color.blue = blue;
    color.alpha = alpha;
  }

  #setSolid(solid: boolean) {
    if (this.#appliedSolid === solid) {
      return;
    }

    this.#gl.uniform1i(this.#uniforms.solid, solid ? 1 : 0);
    this.#appliedSolid = solid;
  }

  #resize() {
    const { width, height } = this.canvas;

    if (width === this.#width && height === this.#height) {
      return;
    }

    this.#width = width;
    this.#height = height;
    this.#appliedClip = undefined;

    this.#gl.viewport(0, 0, width, height);
    this.#gl.uniform2f(this.#uniforms.viewport, width, height);
  }

  #applyClip() {
    const gl = this.#gl;
    const clip = this.#clip;

    if (clip === this.#appliedClip) {
      return;
    }

    this.#appliedClip = clip;

    if (clip == null) {
      gl.disable(gl.SCISSOR_TEST);
      return;
    }

    gl.enable(gl.SCISSOR_TEST);

    const left = Math.max(0, Math.floor(clip[0]));
    const top = Math.max(0, Math.floor(clip[1]));
    const right = Math.min(this.canvas.width, Math.ceil(clip[0] + clip[2]));
    const bottom = Math.min(this.canvas.height, Math.ceil(clip[1] + clip[3]));

    gl.scissor(left, this.canvas.height - bottom, Math.max(0, right - left), Math.max(0, bottom - top));
  }

  #canClearCanvas(x: number, y: number, width: number, height: number) {
    const coversCanvas =
      x === 0 &&
      y === 0 &&
      width === this.canvas.width &&
      height === this.canvas.height;

    const hasDefaultState =
      this.#clip == null &&
      this.globalAlpha === 1 &&
      this.#isIdentity();

    return coversCanvas && hasDefaultState;
  }

  #isIdentity() {
    const [a, b, c, d, e, f] = this.#transform;
    return a === 1 && b === 0 && c === 0 && d === 1 && e === 0 && f === 0;
  }
}
