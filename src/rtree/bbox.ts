import { alias, tuple, f32 } from "#/bindata";

export const bbox = tuple("bbox", [
  alias("minX", f32),
  alias("minY", f32),
  alias("maxX", f32),
  alias("maxY", f32),
]);

export class BBox {
  static Type = bbox;
  static BYTES_PER_ELEMENT = bbox.size;

  static getMinX(data: Float32Array, offset: number) {
    offset >>>= 0;
    return data[offset + bbox.at.minX];
  }

  static setMinX(data: Float32Array, offset: number, value: number) {
    offset >>>= 0;
    data[offset + bbox.at.minX] = value;
  }

  static getMinY(data: Float32Array, offset: number) {
    offset >>>= 0;
    return data[offset + bbox.at.minY];
  }

  static setMinY(data: Float32Array, offset: number, value: number) {
    offset >>>= 0;
    data[offset + bbox.at.minY] = value;
  }

  static getMaxX(data: Float32Array, offset: number) {
    offset >>>= 0;
    return data[offset + bbox.at.maxX];
  }

  static setMaxX(data: Float32Array, offset: number, value: number) {
    offset >>>= 0;
    data[offset + bbox.at.maxX] = value;
  }

  static getMaxY(data: Float32Array, offset: number) {
    offset >>>= 0;
    return data[offset + bbox.at.maxY];
  }

  static setMaxY(data: Float32Array, offset: number, value: number) {
    offset >>>= 0;
    data[offset + bbox.at.maxY] = value;
  }
}
