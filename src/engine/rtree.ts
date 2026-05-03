import { alias, tuple, usize2 } from "#/bindata";

import { RTreeNode } from "#engine/rtree/node";

import type { RtreeView } from "#engine/rtree/types";

export const header = tuple("header", [
  alias("size", usize2),
  alias("reserved", usize2),
]);

export class RTree {
  static readonly Header = header;
  static readonly BYTES_PER_ELEMENT = RTreeNode.BYTES_PER_ELEMENT;

  readonly BYTES_PER_ELEMENT: number;
  readonly minEntries: number;
  readonly maxEntries: number;

  get buffer(): ArrayBufferLike {
    return this.#buffer;
  }

  get byteLength(): number {
    return this.buffer.byteLength;
  }

  get size(): number {
    return this.#size;
  }

  set size(value: number) {
    this.#size = value;
    this.header[header.at.size.index] = value;
  }

  get freePtr32(): number {
    return this.size * this.BYTES_PER_ELEMENT + this.#dataOffset32;
  }

  protected readonly view: RtreeView;
  protected readonly node: RTreeNode;
  protected readonly header: Uint16Array;

  readonly #buffer;
  readonly #dataOffset32;

  #size;

  constructor(maxEntries = 9, buffer?: ArrayBufferLike) {
    this.BYTES_PER_ELEMENT = (this.constructor as typeof RTree).BYTES_PER_ELEMENT;

    this.maxEntries = Math.max(4, maxEntries);
    this.minEntries = Math.max(2, Math.ceil(maxEntries * 0.4));

    this.#buffer = buffer ?? new ArrayBuffer(2 ** 64);

    this.view = {
      blocks: new Uint32Array(this.#buffer, header.size),
      floats: new Float32Array(this.#buffer, header.size)
    };

    this.node = new RTreeNode(this.view);
    this.header = new Uint16Array(this.#buffer, 0, header.size / 2);
    this.#dataOffset32 = Math.ceil(header.size / 4);
    this.#size = this.header[header.at.size.index]!;
  }

  createNode(leaf: boolean, level: number) {
    this.node.create(this.freePtr32, leaf, level);
    this.size++;
  }

  protected chooseLeaf(ptr32: number, minX: number, minY: number, maxX: number, maxY: number): number {
    const { node } = this;

    // Уже находимся в листе
    if (node.isLeaf(ptr32)) {
      return ptr32;
    }

    let bestChildPtr32 = 0;

    let minEnlargement = Infinity;
    let minArea = Infinity;

    node.forEachChild(ptr32, (childPtr32) => {
      // Если нет геометрии - игнорируем
      if (!node.hasBBox(childPtr32)) {
        return;
      }

      const enlargement = node.calcBBoxEnlargement(childPtr32, minX, minY, maxX, maxY);
      const area = node.calcBBoxArea(childPtr32);

      if (enlargement < minEnlargement) {
        minEnlargement = enlargement;
        minArea = area;
        bestChildPtr32 = childPtr32;

      } else if (enlargement === minEnlargement && area < minArea) {
        minArea = area;
        bestChildPtr32 = childPtr32;
      }
    });

    return this.chooseLeaf(bestChildPtr32, minX, minY, maxX, maxY);
  }
}
