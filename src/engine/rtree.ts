import { alias, tuple, usize2 } from "#/bindata";

import { RTreeNode } from "#engine/rtree/node";
import type { RTreePublicNode, RTreeView, Ptr32 } from "#engine/rtree/types";

export const header = tuple("header", [
  alias("size", usize2),
  alias("reserved", usize2),
]);

const BLOCKS32_PER_ELEMENT = RTreeNode.BYTES_PER_ELEMENT / 4;
const HEADER32_OFFSET = header.size / 4;

export class RTree {
  static readonly Header = header;
  static readonly BYTES_PER_ELEMENT = RTreeNode.BYTES_PER_ELEMENT;

  readonly BYTES_PER_ELEMENT = RTree.BYTES_PER_ELEMENT;
  readonly byteOffset: number = 0;

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
    this.#header[header.at.size.index] = value;
  }

  readonly #view: RTreeView;
  readonly #node: RTreeNode;
  readonly #header: Uint16Array;
  readonly #root: Ptr32;

  readonly #buffer;

  #size;

  get #freePtr32(): Ptr32 {
    const ptr = this.size * BLOCKS32_PER_ELEMENT + HEADER32_OFFSET;

    if (ptr >= this.#view.uints32.length - 1) {
      throw new Error(`Out of memory - maximum nodes reached (${this.size})`);
    }

    return ptr;
  }

  constructor(maxEntries = 9, buffer?: ArrayBufferLike) {
    this.maxEntries = Math.max(4, maxEntries);
    this.minEntries = Math.max(2, Math.ceil(maxEntries * 0.4));

    this.#buffer = buffer ?? new ArrayBuffer((2 ** 16) * this.BYTES_PER_ELEMENT);

    this.#view = {
      uints8: new Uint8Array(this.#buffer, header.size),
      uints16: new Uint16Array(this.#buffer, header.size),
      uints32: new Uint32Array(this.#buffer, header.size),
      floats32: new Float32Array(this.#buffer, header.size),
      // Добавление и вычитание единицы нужны, чтобы отличать значение от 0 (null)
      unpackPtr: (ptr) => ptr === 0 ? 0 : (ptr - 1) * BLOCKS32_PER_ELEMENT + HEADER32_OFFSET,
      packPtr: (ptr) => ((ptr - HEADER32_OFFSET) / BLOCKS32_PER_ELEMENT) + 1
    };

    this.#node = new RTreeNode(this.#view);
    this.#header = new Uint16Array(this.#buffer, 0, header.size / 2);

    this.#size = this.#header[header.at.size.index]!;
    this.#root = this.#createEmptyNode();
  }

  search(minX: number, minY: number, maxX: number, maxY: number): RTreePublicNode[] {
    const results: RTreePublicNode[] = [];
    this.#searchNode(this.#root, minX, minY, maxX, maxY, results);
    return results;
  }

  insert(
    kind: number,
    index: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): Ptr32 {
    const node = this.#node;

    const ptr = this.#createEmptyNode();

    node.setData(ptr, kind, index);
    node.setBBox(ptr, minX, minY, maxX, maxY);

    const leaf = this.#chooseLeaf(this.#root, minX, minY, maxX, maxY);
    node.pushChild(leaf, ptr);

    // Обновляем bounding box'ы на пути к корню
    this.#adjustTree(leaf);

    // Проверяем на переполнение
    if (node.getSize(leaf) === this.maxEntries) {
      this.#splitNode(leaf);
    }

    return ptr;
  }

  forEach(cb: (ptr: Ptr32, bbox: RTreePublicNode) => void) {
    const node = this.#node;

    function traverse(ptr: Ptr32) {
      cb(ptr, { bbox: node.getBBox(ptr), pointer: node.getData(ptr) });
      node.forEachChild(ptr, traverse);
    }

    traverse(this.#root);
  }

  #createEmptyNode(level = 0): Ptr32 {
    const newPtr = this.#freePtr32;

    this.#node.createEmpty(newPtr, level);
    this.size++;

    return newPtr;
  }

  #createEmptyNodeFrom(ptr: Ptr32): Ptr32 {
    const node = this.#node;

    const newPtr = this.#createEmptyNode(node.getLevel(ptr));

    node.setParent(newPtr, node.getParent(ptr));

    return newPtr;
  }

  #searchNode(ptr: Ptr32, minX: number, minY: number, maxX: number, maxY: number, results: RTreePublicNode[]) {
    const node = this.#node;

    if (!node.hasIntersection(ptr, minX, minY, maxX, maxY)) {
      return;
    }

    if (node.isLeaf(ptr)) {
      node.forEachChild(ptr, (childPtr) => {
        if (node.hasIntersection(childPtr, minX, minY, maxX, maxY)) {
          results.push({ bbox: node.getBBox(childPtr), pointer: node.getData(childPtr) });
        }
      });

    } else {
      node.forEachChild(ptr, (childPtr) => {
        this.#searchNode(childPtr, minX, minY, maxX, maxY, results);
      });
    }
  }

  #chooseLeaf(ptr: Ptr32, minX: number, minY: number, maxX: number, maxY: number): number {
    const node = this.#node;

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
    const node = this.#node;

    const root = this.#root;
    const parent = node.getParent(ptr);

    // Выбираем два seed-элемента (максимально далекие)
    const seeds = this.#pickSeeds(ptr);

    // Создаем два новых узла
    const group1 = this.#createEmptyNodeFrom(ptr);
    const group2 = this.#createEmptyNodeFrom(ptr);

    node.pushChild(group1, seeds.item1);
    node.pushChild(group2, seeds.item2);

    this.#updateBBox(group1);
    this.#updateBBox(group2);

    // Распределяем остальные элементы
    node.forEachChild(ptr, (childPtr, i) => {
      if (i !== seeds.index1 && i !== seeds.index2) {
        // Добавляем в группу с меньшим увеличением
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
    if (parent !== 0) {
      node.removeChild(parent, ptr);

      node.pushChild(parent, group1);
      node.pushChild(parent, group2);

      if (node.getSize(parent) === this.maxEntries) {
        this.#splitNode(parent);

      } else {
        this.#updateBBox(parent);
      }

    // Если родитель - корень
    } else {
      node.createEmpty(root, node.getLevel(ptr) + 1);

      node.pushChild(root, group1);
      node.pushChild(root, group2);

      this.#updateBBox(root);
    }
  }

  #pickSeeds(ptr: Ptr32): { index1: number; index2: number; item1: Ptr32; item2: Ptr32 } {
    const node = this.#node;

    let maxWaste = -Infinity;

    let index1 = 0;
    let index2 = 0;

    let item1 = 0;
    let item2 = 0;

    node.forEachChild(ptr, (child1Ptr, i) => {
      node.forEachChildFrom(ptr, i + 1, (child2Ptr, j) => {
        const area1 = node.calcBBoxArea(child1Ptr);
        const area2 = node.calcBBoxArea(child2Ptr);

        const unionArea = node.calcUnionBBoxArea(child1Ptr, child2Ptr);
        const waste = unionArea - area1 - area2;

        if (waste > maxWaste) {
          maxWaste = waste;
          index1 = i;
          item1 = child1Ptr;
          index2 = j;
          item2 = child2Ptr;
        }
      });
    });

    return { index1, index2, item1, item2 };
  }

  #adjustTree(ptr: Ptr32) {
    let currentNode = ptr;

    while (currentNode !== 0) {
      this.#updateBBox(currentNode);
      currentNode = this.#node.getParent(currentNode);
    }
  }

  #updateBBox(ptr: Ptr32) {
    const node = this.#node;

    if (node.getSize(ptr) === 0) {
      node.setBBox(ptr, 0, 0, 0, 0);
      return;
    }

    node.setBBox(ptr, Infinity, Infinity, -Infinity, -Infinity);

    node.forEachChild(ptr, (childPtr) => {
      if (node.hasBBox(childPtr)) {
        node.enlargeBBoxFrom(ptr, childPtr);
      }
    });
  }
}
