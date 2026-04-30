import { alias, tuple, f32 } from "#/bindata";

const SCHEME = tuple("BBox", [
  alias("minX", f32),
  alias("minY", f32),
  alias("maxX", f32),
  alias("maxY", f32),
]);

export class BBox {
  static SCHEME = SCHEME;
  static BYTES_PER_ELEMENT = SCHEME.size;

  static getMinX(data: Float32Array, offset: number) {
    offset >>>= 0;
    return data[offset + SCHEME.at.minX];
  }

  static setMinX(data: Float32Array, offset: number, value: number) {
    offset >>>= 0;
    data[offset + SCHEME.at.minX] = value;
  }

  static getMinY(data: Float32Array, offset: number) {
    offset >>>= 0;
    return data[offset + SCHEME.at.minY];
  }

  static setMinY(data: Float32Array, offset: number, value: number) {
    offset >>>= 0;
    data[offset + SCHEME.at.minY] = value;
  }

  static getMaxX(data: Float32Array, offset: number) {
    offset >>>= 0;
    return data[offset + SCHEME.at.maxX];
  }

  static setMaxX(data: Float32Array, offset: number, value: number) {
    offset >>>= 0;
    data[offset + SCHEME.at.maxX] = value;
  }

  static getMaxY(data: Float32Array, offset: number) {
    offset >>>= 0;
    return data[offset + SCHEME.at.maxY];
  }

  static setMaxY(data: Float32Array, offset: number, value: number) {
    offset >>>= 0;
    data[offset + SCHEME.at.maxY] = value;
  }
}
