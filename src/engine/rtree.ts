import { alias, tuple, usize2 } from "#/bindata";

import { RTreeNode } from "#engine/rtree/node";

import type { RtreeView, Ptr32, Ptr16 } from "#engine/rtree/types";

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

  get buffer() {
    return this.#buffer;
  }

  get byteLength() {
    return this.buffer.byteLength;
  }

  get size() {
    return this.#size;
  }

  set size(value: number) {
    this.#size = value;
    this.header[header.at.size.index] = value;
  }

  get freePtr32(): Ptr32 {
    return this.size * this.BYTES_PER_ELEMENT + this.#dataOffset32;
  }

  protected readonly view: RtreeView;
  protected readonly node: RTreeNode;
  protected readonly header: Uint16Array;
  protected root: Ptr32;

  readonly #buffer;
  readonly #dataOffset32: Ptr32;

  #size;

  constructor(maxEntries = 9, buffer?: ArrayBufferLike) {
    this.BYTES_PER_ELEMENT = (this.constructor as typeof RTree).BYTES_PER_ELEMENT;

    this.maxEntries = Math.max(4, maxEntries);
    this.minEntries = Math.max(2, Math.ceil(maxEntries * 0.4));

    this.#buffer = buffer ?? new ArrayBuffer(2 ** 16);

    this.view = {
      uints8: new Uint8Array(this.#buffer, header.size),
      uints16: new Uint16Array(this.#buffer, header.size),
      uints32: new Uint32Array(this.#buffer, header.size),
      floats32: new Float32Array(this.#buffer, header.size)
    };

    this.node = new RTreeNode(this.view);
    this.header = new Uint16Array(this.#buffer, 0, header.size / 2);

    this.#dataOffset32 = Math.ceil(header.size / 4);
    this.#size = this.header[header.at.size.index]!;

    this.root = this.#createEmptyNode(true);
  }

  insert(minX: number, minY: number, maxX: number, maxY: number) {
    const { node } = this;

    const ptr = this.#createEmptyNode();
    node.setBBox(ptr, minX, minY, maxX, maxY);

    const leaf = this.#chooseLeaf(this.root, minX, minY, maxX, maxY);
    node.pushChild(leaf, ptr);

    // Обновляем bounding box'ы на пути к корню
    this.#adjustTree(leaf);

    // Проверяем на переполнение
    if (node.getSize(leaf) === this.maxEntries) {
      this.#splitNode(leaf);
    }

    return ptr;
  }

  search(minX: number, minY: number, maxX: number, maxY: number): Ptr16[] {
    const results: Ptr16[] = [];
    this.#searchNode(this.root, minX, minY, maxX, maxY, results);
    return results;
  }

  #createEmptyNode(leaf = false, level = 0): Ptr32 {
    const newPtr = this.freePtr32;

    this.node.createEmpty(newPtr, leaf, level);
    this.size++;

    return newPtr;
  }

  #createEmptyNodeFrom(ptr: Ptr32): Ptr32 {
    const { node } = this;

    const newPtr = this.#createEmptyNode(node.isLeaf(ptr), node.getLevel(ptr));

    node.setParent(newPtr, node.getParent(ptr));

    return newPtr;
  }

  #searchNode(ptr: Ptr32, minX: number, minY: number, maxX: number, maxY: number, results: Ptr16[]) {
    const { node } = this;

    if (!node.hasIntersection(ptr, minX, minY, maxX, maxY)) {
      return;
    }

    if (node.isLeaf(ptr)) {
      node.forEachChild(ptr, (childPtr) => {
        if (node.hasIntersection(childPtr, minX, minY, maxX, maxY)) {
          results.push(childPtr);
        }
      });

    } else {
      node.forEachChild(ptr, (childPtr) => {
        this.#searchNode(childPtr, minX, minY, maxX, maxY, results);
      });
    }
  }

  #chooseLeaf(ptr: Ptr32, minX: number, minY: number, maxX: number, maxY: number): number {
    const { node } = this;

    // Уже находимся в листе
    if (node.isLeaf(ptr)) {
      return ptr;
    }

    let bestChildPtr = 0;

    let minEnlargement = Infinity;
    let minArea = Infinity;

    node.forEachChild(ptr, (childPtr) => {
      // Если нет геометрии - игнорируем
      if (!node.hasBBox(childPtr)) {
        return;
      }

      const enlargement = node.calcBBoxEnlargement(childPtr, minX, minY, maxX, maxY);
      const area = node.calcBBoxArea(childPtr);

      if (enlargement < minEnlargement) {
        minEnlargement = enlargement;
        minArea = area;
        bestChildPtr = childPtr;

      } else if (enlargement === minEnlargement && area < minArea) {
        minArea = area;
        bestChildPtr = childPtr;
      }
    });

    if (bestChildPtr === 0) {
      throw new Error("No child found in internal node");
    }

    return this.#chooseLeaf(bestChildPtr, minX, minY, maxX, maxY);
  }

  #splitNode(ptr: Ptr32) {
    const { node } = this;

    const parent = node.getParent(ptr);

    // Выбираем два seed-элемента (максимально далекие)
    const seeds = this.#pickSeeds(ptr);

    // Создаем два новых узла
    const group1 = this.#createEmptyNodeFrom(ptr);
    const group2 = this.#createEmptyNodeFrom(ptr);

    node.pushChild(group1, seeds.item1);
    node.pushChild(group2, seeds.item1);

    this.#updateBBox(group1);
    this.#updateBBox(group2);

    let remaining = 0;

    node.forEachChild(ptr, (_, i) => {
      if (i !== seeds.index1 && i !== seeds.index2) {
        remaining++;
      }
    });

    // Распределяем остальные элементы
    node.forEachChild(ptr, (childPtr, i) => {
      if (i !== seeds.index1 && i !== seeds.index2) {
        const group1Size = node.getSize(group1);
        const group2Size = node.getSize(group2);
        const currentRemaining = remaining--;

        // Если одна группа уже набрала минимум, добавляем всё в другую
        if (
          group1Size >= this.minEntries &&
          group2Size + currentRemaining <= this.maxEntries
        ) {
          node.pushChild(group2, childPtr);
          this.#updateBBox(group2);
          return;
        }

        if (
          group2Size >= this.minEntries &&
          group1Size + currentRemaining <= this.maxEntries
        ) {
          node.pushChild(group1, childPtr);
          this.#updateBBox(group1);
          return;
        }

        // Иначе добавляем в группу с меньшим увеличением
        const enlargement1 = node.calcBBoxEnlargementFrom(group1, childPtr);
        const enlargement2 = node.calcBBoxEnlargementFrom(group2, childPtr);

        if (enlargement1 < enlargement2) {
          node.pushChild(group1, childPtr);
          this.#updateBBox(group1);

        } else if (enlargement2 < enlargement1) {
          node.pushChild(group2, childPtr);
          this.#updateBBox(group2);

        } else {
          // При равенстве - в группу с меньшей площадью
          const area1 = node.calcBBoxArea(group1);
          const area2 = node.calcBBoxArea(group2);

          if (area1 < area2) {
            node.pushChild(group1, childPtr);
            this.#updateBBox(group1);

          } else {
            node.pushChild(group2, childPtr);
            this.#updateBBox(group2);
          }
        }
      }
    });

    // Заменяем старый узел двумя новыми
    if (parent !== this.root) {
      node.removeChild(parent, ptr);
      node.pushChild(parent, group1);
      node.pushChild(parent, group2);

      if (node.getSize(parent) > this.maxEntries) {
        this.#splitNode(parent);

      } else {
        this.#updateBBox(parent);
      }

    } else {
      this.node.createEmpty(this.root, false, node.getLevel(ptr) + 1);

      node.pushChild(this.root, group1);
      node.pushChild(this.root, group2);

      node.setParent(group1, this.root);
      node.setParent(group2, this.root);

      this.#updateBBox(this.root);
    }
  }

  #pickSeeds(ptr: Ptr32): { index1: number; index2: number; item1: Ptr32; item2: Ptr32 } {
    const { node } = this;

    let maxWaste = -Infinity;

    let seed1 = 0;
    let seed2 = 0;

    node.forEachChild(ptr, (child1Ptr, i) => {
      node.forEachChildFrom(ptr, i + 1, (child2Ptr, j) => {
        const area1 = node.calcBBoxArea(child1Ptr);
        const area2 = node.calcBBoxArea(child2Ptr);
        const unionArea = node.calcUnionBBoxArea(child1Ptr, child2Ptr);

        const waste = unionArea - area1 - area2;

        if (waste > maxWaste) {
          maxWaste = waste;
          seed1 = i;
          seed2 = j;
        }
      });
    });

    return {
      index1: seed1,
      index2: seed2,
      item1: node.getChild(ptr, seed1),
      item2: node.getChild(ptr, seed2)
    };
  }

  #adjustTree(ptr: Ptr32) {
    let currentNode = ptr;

    while (currentNode !== 0) {
      this.#updateBBox(currentNode);
      currentNode = this.node.getParent(currentNode);
    }
  }

  #updateBBox(ptr: Ptr32) {
    const { node } = this;

    if (node.getSize(ptr) === 0) {
      node.setBBox(ptr, 0, 0, 0, 0);
      return;
    }

    node.forEachChild(ptr, (childPtr) => {
      if (node.hasBBox(childPtr)) {
        node.enlargeBBoxFrom(ptr, childPtr);
      }
    });
  }
}
