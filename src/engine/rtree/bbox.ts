import { alias, tuple, f32 } from "#/bindata";
import { BinView } from "#engine/rtree/binview";

export const bbox = tuple("bbox", [
  alias("minX", f32),
  alias("minY", f32),
  alias("maxX", f32),
  alias("maxY", f32),
]);

const { offsets32 } = bbox;

export class BBox extends BinView {
  static readonly Scheme = bbox;
  static override readonly BYTES_PER_ELEMENT = BBox.Scheme.size;

  isNull(ptr32: number): boolean {
    // Bbox считается null, если оба max-а равны 0.
    // При этом min-ы всегда тоже 0 (гарантируется логикой вставки/обновления).
    return this.getMaxX(ptr32) === 0 && this.getMaxY(ptr32) === 0;
  }

  getMinX(ptr32: number): number {
    return this.view.floats32[ptr32 + offsets32.minX]!;
  }

  getMinY(ptr32: number): number {
    return this.view.floats32[ptr32 + offsets32.minY]!;
  }

  getMaxX(ptr32: number): number {
    return this.view.floats32[ptr32 + offsets32.maxX]!;
  }

  getMaxY(ptr32: number): number {
    return this.view.floats32[ptr32 + offsets32.maxY]!;
  }

  set(ptr32: number, minX: number, minY: number, maxX: number, maxY: number) {
    const { floats32 } = this.view;

    floats32[ptr32 + offsets32.minX] = minX;
    floats32[ptr32 + offsets32.minY] = minY;
    floats32[ptr32 + offsets32.maxX] = maxX;
    floats32[ptr32 + offsets32.maxY] = maxY;
  }

  calcArea(ptr32: number): number {
    return (this.getMaxX(ptr32) - this.getMinX(ptr32)) * (this.getMaxY(ptr32) - this.getMinY(ptr32));
  }

  calcEnlargement(ptr32: number, minX: number, minY: number, maxX: number, maxY: number): number {
    const newMinX = Math.min(this.getMinX(ptr32), minX);
    const newMinY = Math.min(this.getMinY(ptr32), minY);
    const newMaxX = Math.max(this.getMaxX(ptr32), maxX);
    const newMaxY = Math.max(this.getMaxY(ptr32), maxY);

    // Площадь bbox после добавления
    const newArea = (newMaxX - newMinX) * (newMaxY - newMinY);

    return newArea - this.calcArea(ptr32);
  }
}
