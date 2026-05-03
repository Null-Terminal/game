import { encodeToSmi, decodeFromSmi, createMask } from "#/bindata";
import { alias, array, tuple, bintype, usize2, u8, bool } from "#/bindata";

import { BinView } from "#engine/rtree/binview";

import { bbox, BBox } from "#engine/rtree/bbox";
import type { RtreeView } from "#engine/rtree/types";

const node = tuple("RTreeNode", [
  bbox,
  alias("size", u8),
  array("children", usize2, 16),
  alias("parent", usize2),
  alias("level", u8),
  alias("leaf", bool),
  bintype("data", 11),
]);

export class RTreeNode extends BinView {
  static readonly Scheme = node;
  static override readonly BYTES_PER_ELEMENT: 64 = RTreeNode.Scheme.size;

  readonly #bbox;

  constructor(view: RtreeView) {
    super(view);
    this.#bbox = new BBox(view);
  }

  create(ptr32: number, leaf: boolean, level: number) {
    const { blocks } = this.view;

    blocks[ptr32 + node.offsets32.leaf]! |= encodeToSmi(leaf, node.sizes.leaf, node.offsets32Bit.leaf);
    blocks[ptr32 + node.offsets32.level]! |= encodeToSmi(level, node.sizes.level, node.offsets32Bit.level);
  }

  hasBBox(ptr32: number): boolean {
    return !this.#bbox.isNull(this.#getBBoxPtr(ptr32));
  }

  setBBox(ptr32: number, minX: number, minY: number, maxX: number, maxY: number) {
    this.#bbox.set(this.#getBBoxPtr(ptr32), minX, minY, maxX, maxY);
  }

  calcBBoxArea(ptr32: number): number {
    return this.#bbox.calcArea(this.#getBBoxPtr(ptr32));
  }

  calcBBoxEnlargement(ptr32: number, minX: number, minY: number, maxX: number, maxY: number): number {
    return this.#bbox.calcEnlargement(this.#getBBoxPtr(ptr32), minX, minY, maxX, maxY);
  }

  isLeaf(ptr32: number): boolean {
    return Boolean(
      decodeFromSmi(this.view.blocks[ptr32 + node.offsets32.leaf]!, node.sizes.leaf, node.offsets32Bit.leaf)
    );
  }

  getSize(ptr32: number): number {
    return decodeFromSmi(this.view.blocks[ptr32 + node.offsets32.size]!, node.sizes.size, node.offsets32Bit.size);
  }

  forEachChild(ptr32: number, cb: (ptr32: number, i: number) => void) {
    const { blocks } = this.view;

    const BYTES_PER_CHILD = node.at.children.element.size;
    const BITS_PER_CHILD = BYTES_PER_CHILD * 8;
    const CHILD_MASK = createMask(BYTES_PER_CHILD);

    const start = ptr32 + node.offsets32.children;
    const end = start + node.sizes.children;

    for (let i = 0, offset = start; offset < end; i++, offset += BYTES_PER_CHILD) {
      const shift = i % 2 !== 0 ? BITS_PER_CHILD : 0;
      cb((blocks[offset]! >> shift) & CHILD_MASK, i);
    }
  }

  #getBBoxPtr(ptr32: number): number {
    return ptr32 + node.offsets32.bbox;
  }
}
