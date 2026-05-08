import { alias, array, tuple, bintype, usize2, u8 } from "#/bindata";

import { BinView } from "#engine/rtree/binview";

import { bbox, BBox, type BBoxTuple } from "#engine/rtree/bbox";
import type { RtreeView, Ptr32, Ptr32To16 } from "#engine/rtree/types";

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

const MAX_U8 = 2 ** 8 - 1;

export class RTreeNode extends BinView {
  static readonly Scheme = node;
  static override readonly BYTES_PER_ELEMENT: 64 = RTreeNode.Scheme.size;

  readonly #bbox;

  constructor(view: RtreeView) {
    super(view);
    this.#bbox = new BBox(view);
  }

  createEmpty(ptr: Ptr32, level = 0) {
    this.#clearMemory(ptr);

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

  getParent(ptr: Ptr32): Ptr32To16 {
    return this.view.unpackPtr(this.view.uints16[ptr * 2 + offsets16.parent]!);
  }

  setParent(ptr: Ptr32, parentPtr: Ptr32To16) {
    this.view.uints16[ptr * 2 + offsets16.parent]! = this.view.packPtr(parentPtr);
  }

  isLeaf(ptr: Ptr32): boolean {
    return this.view.uints8[ptr * 4 + offsets8.level]! === 0;
  }

  getLevel(ptr: Ptr32): number {
    return this.view.uints8[ptr * 4 + offsets8.level]!;
  }

  setLevel(ptr: Ptr32, level: number) {
    if (level > MAX_U8) {
      throw new Error(`Level overflow: ${level} >= ${MAX_U8} (max 8-bit value)`);
    }

    this.view.uints8[ptr * 4 + offsets8.level]! = level;
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

  getChild(ptr: Ptr32, index: number): Ptr32To16 {
    if (index >= this.getSize(ptr)) {
      throw new Error(`Child index ${index} out of bounds: size=${this.getSize(ptr)}`);
    }

    return this.view.unpackPtr(this.view.uints16[ptr * 2 + offsets16.children + index]!);
  }

  pushChild(ptr: Ptr32, childPtr: Ptr32To16) {
    const childIndex = this.getSize(ptr);

    this.setSize(ptr, childIndex + 1);
    this.setParent(childPtr, ptr);

    this.view.uints16[ptr * 2 + offsets16.children + childIndex]! = this.view.packPtr(childPtr);
  }

  removeChild(ptr: Ptr32, childPtr: Ptr32To16): boolean {
    const { view } = this;

    const start = ptr * 2 + offsets16.children;
    const size = this.getSize(ptr);

    const children = view.uints16;
    const packedPtr = view.packPtr(childPtr);

    // Ищем индекс ребёнка
    let indexToRemove = -1;

    for (let i = 0; i < size; i++) {
      if (children[start + i]! === packedPtr) {
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

  children(ptr: Ptr32): IterableIterator<Ptr32To16> {
    const { view } = this;
    const children = view.uints16;

    const start = ptr * 2 + offsets16.children;
    const end = start + this.getSize(ptr);

    let offset = start;

    return {
      [Symbol.iterator]() {
        return this;
      },

      next: () => {
        if (offset >= end) {
          return { done: true, value: undefined };
        }

        return { done: false, value: view.unpackPtr(children[offset++]!) };
      }
    };
  }

  forEachChild(ptr: Ptr32, cb: (ptr: Ptr32To16, i: number) => void) {
    const { view } = this;
    const children = view.uints16;

    const start = ptr * 2 + offsets16.children;
    const end = start + this.getSize(ptr);

    for (let i = 0, offset = start; offset < end; offset++, i++) {
      cb(view.unpackPtr(children[offset]!), i);
    }
  }

  forEachChildFrom(ptr: Ptr32, from: number, cb: (ptr: Ptr32To16, i: number) => void) {
    const { view } = this;
    const children = view.uints16;

    const start = ptr * 2 + offsets16.children;
    const end = start + this.getSize(ptr);

    for (let i = from, offset = start + from; offset < end; offset++, i++) {
      cb(view.unpackPtr(children[offset]!), i);
    }
  }

  enlargeBBoxFrom(ptr: Ptr32, enlargerPtr: Ptr32) {
    const bbox = this.#bbox;
    const bboxPtr = this.#getBBoxPtr(ptr);

    if (bbox.isNull(bboxPtr)) {
      return;
    }

    const enlargerBBoxPtr = this.#getBBoxPtr(enlargerPtr);

    const minX = bbox.getMinX(enlargerBBoxPtr);
    const minY = bbox.getMinY(enlargerBBoxPtr);
    const maxX = bbox.getMaxX(enlargerBBoxPtr);
    const maxY = bbox.getMaxY(enlargerBBoxPtr);

    this.#bbox.enlarge(this.#getBBoxPtr(ptr), minX, minY, maxX, maxY);
  }

  calcBBoxEnlargementFrom(ptr: Ptr32, enlargerPtr: Ptr32): number {
    const bbox = this.#bbox;
    const bboxPtr = this.#getBBoxPtr(ptr);

    if (bbox.isNull(bboxPtr)) {
      return 0;
    }

    const enlargerBBoxPtr = this.#getBBoxPtr(enlargerPtr);

    const minX = bbox.getMinX(enlargerBBoxPtr);
    const minY = bbox.getMinY(enlargerBBoxPtr);
    const maxX = bbox.getMaxX(enlargerBBoxPtr);
    const maxY = bbox.getMaxY(enlargerBBoxPtr);

    return bbox.calcEnlargement(bboxPtr, minX, minY, maxX, maxY);
  }

  calcBBoxEnlargement(ptr: Ptr32, minX: number, minY: number, maxX: number, maxY: number): number {
    const bbox = this.#bbox;
    const bboxPtr = this.#getBBoxPtr(ptr);

    if (bbox.isNull(bboxPtr)) {
      return 0;
    }

    return bbox.calcEnlargement(bboxPtr, minX, minY, maxX, maxY);
  }

  calcUnionBBoxArea(ptr1: Ptr32, ptr2: Ptr32): number {
    const bbox = this.#bbox;

    const bboxPtr1 = this.#getBBoxPtr(ptr1);
    const bboxPtr2 = this.#getBBoxPtr(ptr2);

    const unionMinX = Math.min(bbox.getMinX(bboxPtr1), bbox.getMinX(bboxPtr2));
    const unionMinY = Math.min(bbox.getMinY(bboxPtr1), bbox.getMinY(bboxPtr2));
    const unionMaxX = Math.max(bbox.getMaxX(bboxPtr1), bbox.getMaxX(bboxPtr2));
    const unionMaxY = Math.max(bbox.getMaxY(bboxPtr1), bbox.getMaxY(bboxPtr2));

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
