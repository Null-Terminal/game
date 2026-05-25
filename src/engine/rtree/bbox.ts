import { alias, tuple, f32 } from "#/bindata";

import { BinView } from "#engine/rtree/binview";
import type { Ptr32 } from "#engine/rtree/types";

export type BBoxTuple = [minX: number, minY: number, maxX: number, maxY: number];

export const bbox = tuple("bbox", [
  alias("minX", f32),
  alias("minY", f32),
  alias("maxX", f32),
  alias("maxY", f32),
]);

const { offsets32 } = bbox;

export class BBox extends BinView {
  static readonly Scheme = bbox;
  static override readonly BYTES_PER_ELEMENT = this.Scheme.size;

  isNull(ptr: Ptr32): boolean {
    // Bbox считается null, если оба max-а равны 0.
    // При этом min-ы всегда тоже 0 (гарантируется логикой вставки/обновления).
    return this.getMaxX(ptr) === 0 && this.getMaxY(ptr) === 0;
  }

  hasIntersection(ptr: Ptr32, minX: number, minY: number, maxX: number, maxY: number) {
    if (this.isNull(ptr)) {
      return false;
    }

    return this.getMaxX(ptr) >= minX &&
      this.getMinX(ptr) <= maxX &&
      this.getMaxY(ptr) >= minY &&
      this.getMinY(ptr) <= maxY;
  }

  getMinX(ptr: Ptr32): number {
    return this.view.floats32[ptr + offsets32.minX]!;
  }

  getMinY(ptr: Ptr32): number {
    return this.view.floats32[ptr + offsets32.minY]!;
  }

  getMaxX(ptr: Ptr32): number {
    return this.view.floats32[ptr + offsets32.maxX]!;
  }

  getMaxY(ptr: Ptr32): number {
    return this.view.floats32[ptr + offsets32.maxY]!;
  }

  get(ptr: Ptr32): BBoxTuple {
    return [this.getMinX(ptr), this.getMinY(ptr), this.getMaxX(ptr), this.getMaxY(ptr)];
  }

  set(ptr: Ptr32, minX: number, minY: number, maxX: number, maxY: number) {
    const { floats32 } = this.view;

    floats32[ptr + offsets32.minX] = minX;
    floats32[ptr + offsets32.minY] = minY;
    floats32[ptr + offsets32.maxX] = maxX;
    floats32[ptr + offsets32.maxY] = maxY;
  }

  enlarge(ptr: Ptr32, minX: number, minY: number, maxX: number, maxY: number) {
    const newMinX = Math.min(this.getMinX(ptr), minX);
    const newMinY = Math.min(this.getMinY(ptr), minY);
    const newMaxX = Math.max(this.getMaxX(ptr), maxX);
    const newMaxY = Math.max(this.getMaxY(ptr), maxY);

    this.set(ptr, newMinX, newMinY, newMaxX, newMaxY);
  }

  calcEnlargement(ptr: Ptr32, minX: number, minY: number, maxX: number, maxY: number): number {
    const newMinX = Math.min(this.getMinX(ptr), minX);
    const newMinY = Math.min(this.getMinY(ptr), minY);
    const newMaxX = Math.max(this.getMaxX(ptr), maxX);
    const newMaxY = Math.max(this.getMaxY(ptr), maxY);

    // Площадь bbox после добавления
    const newArea = (newMaxX - newMinX) * (newMaxY - newMinY);

    return newArea - this.calcArea(ptr);
  }

  calcArea(ptr: Ptr32): number {
    return (this.getMaxX(ptr) - this.getMinX(ptr)) * (this.getMaxY(ptr) - this.getMinY(ptr));
  }
}
