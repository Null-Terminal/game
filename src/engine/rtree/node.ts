import { alias, array, tuple, bintype, usize2, u8 } from "#/bindata";

import { BinView } from "#engine/rtree/binview";

import { bbox, BBox, type BBoxTuple } from "#engine/rtree/bbox";
import type { RtreeView, Ptr32, Ptr16 } from "#engine/rtree/types";

export type { BBoxTuple };

export const node = tuple("RTreeNode", [
  bbox,
  alias("parent", usize2),
  alias("level", u8),
  alias("size", u8),
  array("children", usize2, 16),
  bintype("data", 12),
]);

const { at, offsets8, offsets16, offsets32 } = node;

export class RTreeNode extends BinView {
  static readonly Scheme = node;
  static override readonly BYTES_PER_ELEMENT: 64 = RTreeNode.Scheme.size;

  readonly #bbox;

  constructor(view: RtreeView) {
    super(view);
    this.#bbox = new BBox(view);
  }

  createEmpty(ptr: Ptr32, leaf = false, level = 0) {
    this.#clearMemory(ptr);

    if (leaf) {
      this.markLeaf(ptr, leaf);
    }

    if (level > 0) {
      this.setLevel(ptr, level);
    }
  }

  hasIntersection(ptr: Ptr32, minX: number, minY: number, maxX: number, maxY: number) {
    return this.#bbox.hasIntersection(this.#getBBoxPtr(ptr), minX, minY, maxX, maxY);
  }

  hasBBox(ptr: Ptr32): boolean {
    return !this.#bbox.isNull(this.#getBBoxPtr(ptr));
  }

  getBBox(ptr: Ptr32): BBoxTuple {
    return this.#bbox.get(this.#getBBoxPtr(ptr));
  }

  setBBox(ptr: Ptr32, minX: number, minY: number, maxX: number, maxY: number) {
    this.#bbox.set(this.#getBBoxPtr(ptr), minX, minY, maxX, maxY);
  }

  calcBBoxArea(ptr: Ptr32): number {
    return this.#bbox.calcArea(this.#getBBoxPtr(ptr));
  }

  getParent(ptr: Ptr32): Ptr16 {
      return this.view.uints16[ptr * 2 + offsets16.parent]!;
  }

  setParent(ptr: Ptr32, parentPtr: Ptr16) {
    this.view.uints16[ptr * 2 + offsets16.parent]! = parentPtr;
  }

  isLeaf(ptr: Ptr32): boolean {
    return Boolean(this.view.uints8[ptr * 4 + offsets8.level]! & 1);
  }

  markLeaf(ptr: Ptr32, leaf: boolean) {
    this.view.uints8[ptr * 4 + offsets8.level]! |= Number(leaf);
  }

  getLevel(ptr: Ptr32): number {
    return this.view.uints8[ptr * 4 + offsets8.level]! >>> 1;
  }

  setLevel(ptr: Ptr32, level: number) {
    if (level >= 128) {
      throw new Error(`Level overflow: ${level} >= 128 (max 7-bit value)`);
    }

    this.view.uints8[ptr * 4 + offsets8.level]! = level << 1;
  }

  getSize(ptr: Ptr32): number {
    return this.view.uints8[ptr * 4 + offsets8.size]!;
  }

  setSize(ptr: Ptr32, size: number) {
    if (size > at.children.length) {
      throw new Error(`Children array overflow: size=${size}, max=${at.children.length}`);
    }

    this.view.uints8[ptr * 4 + offsets8.size]! = size;
  }

  getChild(ptr: Ptr32, index: number): Ptr16 {
    if (index >= this.getSize(ptr)) {
      throw new Error(`Child index ${index} out of bounds: size=${this.getSize(ptr)}`);
    }

    return this.view.uints16[ptr * 2 + offsets16.children + index]!;
  }

  pushChild(ptr: Ptr32, childPtr: Ptr16) {
    const childIndex = this.getSize(ptr);

    this.setSize(ptr, childIndex + 1);

    this.view.uints16[ptr * 2 + offsets16.children + childIndex]! = childPtr;
  }

  removeChild(ptr: Ptr32, childPtr: Ptr16): boolean {
    const children = this.view.uints16;

    const start = ptr * 2 + offsets16.children;
    const size = this.getSize(ptr);

    // Ищем индекс ребёнка
    let indexToRemove = -1;

    for (let i = 0; i < size; i++) {
      if (children[start + i] === childPtr) {
        indexToRemove = i;
        break;
      }
    }

    if (indexToRemove === -1) {
      return false;
    }

    const lastIndex = size - 1;

    // Если удаляем не последний, то заменяем последним
    if (indexToRemove !== lastIndex) {
      children[start + indexToRemove] = children[start + lastIndex]!;
    }

    children[start + lastIndex] = 0;

    this.setSize(ptr, size - 1);

    return true;
  }

  children(ptr: Ptr32): IterableIterator<Ptr16> {
    const children = this.view.uints16;

    const start = ptr * 2 + offsets16.children;
    const end = start + this.getSize(ptr);

    let offset = start;

    return {
      [Symbol.iterator]() {
        return this;
      },

      next() {
        if (offset >= end) {
          return { done: true, value: undefined };
        }

        return { done: false, value: children[offset++]! };
      }
    };
  }

  forEachChild(ptr: Ptr32, cb: (ptr: Ptr16, i: number) => void) {
    const children = this.view.uints16;

    const start = ptr * 2 + offsets16.children;
    const end = start + this.getSize(ptr);

    for (let i = 0, offset = start; offset < end; offset++, i++) {
      cb(children[offset]!, i);
    }
  }

  forEachChildFrom(ptr: Ptr32, from: number, cb: (ptr: Ptr16, i: number) => void) {
    const children = this.view.uints16;

    const start = ptr * 2 + offsets16.children;
    const end = start + this.getSize(ptr);

    for (let i = from, offset = start + from; offset < end; offset++, i++) {
      cb(children[offset]!, i);
    }
  }

  enlargeBBoxFrom(ptr: Ptr32, enlargerPtr: Ptr32) {
    const bbox = this.#bbox;

    const minX = bbox.getMinX(enlargerPtr);
    const minY = bbox.getMinY(enlargerPtr);
    const maxX = bbox.getMaxX(enlargerPtr);
    const maxY = bbox.getMaxY(enlargerPtr);

    this.#bbox.enlarge(this.#getBBoxPtr(ptr), minX, minY, maxX, maxY);
  }

  calcBBoxEnlargementFrom(ptr: Ptr32, enlargerPtr: Ptr32): number {
    const bbox = this.#bbox;

    const minX = bbox.getMinX(enlargerPtr);
    const minY = bbox.getMinY(enlargerPtr);
    const maxX = bbox.getMaxX(enlargerPtr);
    const maxY = bbox.getMaxY(enlargerPtr);

    return this.#bbox.calcEnlargement(this.#getBBoxPtr(ptr), minX, minY, maxX, maxY);
  }

  calcBBoxEnlargement(ptr: Ptr32, minX: number, minY: number, maxX: number, maxY: number): number {
    return this.#bbox.calcEnlargement(this.#getBBoxPtr(ptr), minX, minY, maxX, maxY);
  }

  calcUnionBBoxArea(ptr1: Ptr32, ptr2: Ptr32): number {
    const bbox = this.#bbox;

    const unionMinX = Math.min(bbox.getMinX(ptr1), bbox.getMinX(ptr2));
    const unionMinY = Math.min(bbox.getMinY(ptr1), bbox.getMinY(ptr2));
    const unionMaxX = Math.max(bbox.getMaxX(ptr1), bbox.getMaxX(ptr2));
    const unionMaxY = Math.max(bbox.getMaxY(ptr1), bbox.getMaxY(ptr2));

    return (unionMaxX - unionMinX) * (unionMaxY - unionMinY);
  }

  #clearMemory(ptr: Ptr32) {
    const start = ptr * 4;
    const end = start + node.size;

    for (let i = start; i < end; i++) {
      this.view.uints8[i] = 0;
    }
  }

  #getBBoxPtr(ptr: Ptr32): number {
    return ptr + offsets32.bbox;
  }
}
