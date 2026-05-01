import { alias, tuple, f32 } from "#/bindata";

export const bbox = tuple("bbox", [
  alias("minX", f32),
  alias("minY", f32),
  alias("maxX", f32),
  alias("maxY", f32),
]);

export type BBoxTuple = [minX: number, minY: number, maxX: number, maxY: number];

export class BBox {
  static readonly Type = bbox;
  static readonly BYTES_PER_ELEMENT = bbox.size;

  static get(data: Float32Array, offset: number): BBoxTuple {
    return [
      data[offset + bbox.at.minX]!,
      data[offset + bbox.at.minY]!,
      data[offset + bbox.at.maxX]!,
      data[offset + bbox.at.maxY]!
    ];
  }

  static set(data: Float32Array, offset: number, minX: number, minY: number, maxX: number, maxY: number) {
    data[offset + bbox.at.minX] = minX;
    data[offset + bbox.at.minY] = minY;
    data[offset + bbox.at.maxX] = maxX;
    data[offset + bbox.at.maxY] = maxY;
  }

  get BYTES_PER_ELEMENT() {
    return bbox.size;
  }

  get byteLength() {
    return this.#data.byteLength;
  }

  get byteOffset() {
    return this.#data.byteOffset + this.#offset;
  }

  readonly #data;
  readonly #offset;

  constructor(data: Float32Array, offset = 0) {
    this.#data = data;
    this.#offset = offset >>> 0;
  }

  get minX() {
    return this.#data[this.#offset + bbox.at.minX]!;
  }

  set minX(value: number) {
    this.#data[this.#offset + bbox.at.minX] = value;
  }

  get minY() {
    return this.#data[this.#offset + bbox.at.minY]!;
  }

  set minY(value) {
    this.#data[this.#offset + bbox.at.minY] = value;
  }

  get maxX() {
    return this.#data[this.#offset + bbox.at.maxX]!;
  }

  set maxX(value) {
    this.#data[this.#offset + bbox.at.maxX] = value;
  }

  get maxY() {
    return this.#data[this.#offset + bbox.at.maxY]!;
  }

  set maxY(value) {
    this.#data[this.#offset + bbox.at.maxY] = value;
  }
}
