import { alias, tuple, usize2 } from "#/bindata";

import { RTreeNode } from "#engine/rtree/node";
import type { RTreeEntry, RTreePublicNode, RTreePredicate, RTreeView, Ptr32 } from "#engine/rtree/types";

export type { RTreeEntry, RTreePublicNode, RTreePredicate };
export type { BBoxTuple } from "#engine/rtree/bbox";

export const header = tuple("header", [
  alias("size", usize2),
  alias("root", usize2),
]);

const BLOCKS32_PER_ELEMENT = RTreeNode.BYTES_PER_ELEMENT / 4;
const HEADER32_OFFSET = header.size / 4;
const EMPTY_RESULTS = Object.freeze([] as RTreePublicNode[]);

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
  readonly #buffer;

  #size;
  #rootPtr: Ptr32 = 0;

  get #root(): Ptr32 {
    return this.#rootPtr;
  }

  set #root(ptr: Ptr32) {
    this.#rootPtr = ptr;
    this.#header[header.at.root.index] = this.#view.packPtr(ptr);
  }

  get #freePtr32(): Ptr32 {
    const ptr = this.#view.unpackPtr(this.size + 1);

    if (ptr + BLOCKS32_PER_ELEMENT > this.#view.uints32.length) {
      throw new Error(`${this.constructor.name}: Out of memory - maximum nodes reached (${this.size})`);
    }

    return ptr;
  }

  constructor(maxEntries = 9, buffer?: ArrayBufferLike) {
    if (maxEntries > 16) {
      throw new Error(`${this.constructor.name}: maxEntries cannot exceed 16 (got ${maxEntries})`);
    }

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
    this.#root = this.#size === 0 ? this.#createEmptyNode() : this.#view.unpackPtr(this.#header[header.at.root.index]!);
  }

  clear() {
    this.size = 0;
    this.#root = this.#createEmptyNode();
  }

  search(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    pred?: RTreePredicate
  ): readonly RTreePublicNode[] {
    if (minX > maxX) {
      [minX, maxX] = [maxX, minX];
    }

    if (minY > maxY) {
      [minY, maxY] = [maxY, minY];
    }

    return this.#searchNode(this.#root, minX, minY, maxX, maxY, null, pred) ?? EMPTY_RESULTS;
  }

  searchFirst(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    pred?: RTreePredicate
  ): RTreePublicNode | null {
    if (minX > maxX) {
      [minX, maxX] = [maxX, minX];
    }

    if (minY > maxY) {
      [minY, maxY] = [maxY, minY];
    }

    return this.#searchFirstNode(this.#root, minX, minY, maxX, maxY, pred);
  }

  insert(
    kind: number,
    index: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): Ptr32 {
    if (minX > maxX) {
      [minX, maxX] = [maxX, minX];
    }

    if (minY > maxY) {
      [minY, maxY] = [maxY, minY];
    }

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

  remove(
    kind: number,
    index: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): boolean {
    if (minX > maxX) {
      [minX, maxX] = [maxX, minX];
    }

    if (minY > maxY) {
      [minY, maxY] = [maxY, minY];
    }

    const orphans: Ptr32[] = [];
    const found = this.#removeNode(this.#root, kind, index, minX, minY, maxX, maxY, orphans);

    for (const orphan of orphans) {
      this.#attachNode(orphan);
    }

    return found;
  }

  forEach(cb: (node: RTreePublicNode) => void) {
    const node = this.#node;

    function traverse(ptr: Ptr32) {
      cb({ bbox: node.getBBox(ptr), pointer: node.getData(ptr) });
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

  #searchNode(
    ptr: Ptr32,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    results: RTreePublicNode[] | null,
    pred?: RTreePredicate
  ): RTreePublicNode[] | null {
    const node = this.#node;

    if (!node.hasIntersection(ptr, minX, minY, maxX, maxY)) {
      return results;
    }

    if (node.isLeaf(ptr)) {
      node.forEachChild(ptr, (childPtr) => {
        if (node.hasIntersection(childPtr, minX, minY, maxX, maxY)) {
          const childNode = { bbox: node.getBBox(childPtr), pointer: node.getData(childPtr) };

          if (pred == null || pred(childNode)) {
            (results ??= []).push(childNode);
          }
        }
      });

    } else {
      node.forEachChild(ptr, (childPtr) => {
        results = this.#searchNode(childPtr, minX, minY, maxX, maxY, results, pred);
      });
    }

    return results;
  }

  #searchFirstNode(
    ptr: Ptr32,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    pred?: RTreePredicate
  ): RTreePublicNode | null  {
    const node = this.#node;

    if (!node.hasIntersection(ptr, minX, minY, maxX, maxY)) {
      return null;
    }

    if (node.isLeaf(ptr)) {
      return node.firstChildResult(ptr, (childPtr) => {
        if (node.hasIntersection(childPtr, minX, minY, maxX, maxY)) {
          const childNode = { bbox: node.getBBox(childPtr), pointer: node.getData(childPtr) };

          if (pred == null || pred(childNode)) {
            return childNode;
          }
        }

        return null;
      });
    }

    return node.firstChildResult(ptr, (childPtr) => this.#searchFirstNode(childPtr, minX, minY, maxX, maxY, pred));
  }

  #chooseLeaf(ptr: Ptr32, minX: number, minY: number, maxX: number, maxY: number): number {
    return this.#chooseNode(ptr, minX, minY, maxX, maxY, 0);
  }

  #chooseNode(ptr: Ptr32, minX: number, minY: number, maxX: number, maxY: number, level: number): Ptr32 {
    const node = this.#node;

    if (node.getLevel(ptr) === level) {
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
      throw new Error(`${this.constructor.name}: No child found in internal node`);
    }

    return this.#chooseNode(bestChildPtr, minX, minY, maxX, maxY, level);
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

      this.#release(ptr);

      if (node.getSize(parent) >= this.maxEntries) {
        this.#splitNode(parent);

      } else {
        this.#updateBBox(parent);
      }

    // Если корень
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

  #removeNode(
    ptr: Ptr32,
    kind: number,
    index: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    orphans: Ptr32[],
  ): boolean {
    const node = this.#node;

    if (!node.hasIntersection(ptr, minX, minY, maxX, maxY)) {
      return false;
    }

    if (node.isLeaf(ptr)) {
      const child = node.firstChildResult(ptr, (childPtr) => {
        if (!node.hasIntersection(childPtr, minX, minY, maxX, maxY)) {
          return null;
        }

        const pointer = node.getData(childPtr);

        if (pointer[0] === kind && pointer[1] === index) {
          return childPtr;
        }

        return null;
      });

      if (child == null) {
        return false;
      }

      node.removeChild(ptr, child);

      const movedFrom = this.#release(child, orphans);
      const leaf = movedFrom !== 0 && ptr === movedFrom ? child : ptr;

      this.#condense(leaf, orphans);
      return true;
    }

    return node.firstChildResult(ptr, (childPtr) => {
      return this.#removeNode(childPtr, kind, index, minX, minY, maxX, maxY, orphans) ? true : null;
    }) === true;
  }

  #condense(ptr: Ptr32, orphans: Ptr32[]) {
    const node = this.#node;

    let current = ptr;

    while (current !== this.#root && node.getSize(current) < this.minEntries) {
      const count = node.getSize(current);

      for (let i = 0; i < count; i++) {
        orphans.push(node.getChild(current, i));
      }

      let parent = node.getParent(current);

      node.removeChild(parent, current);

      const movedFrom = this.#release(current, orphans);

      if (movedFrom !== 0 && parent === movedFrom) {
        parent = current;
      }

      current = parent;
    }

    if (current === this.#root && !node.isLeaf(current) && node.getSize(current) === 1) {
      const child = node.getChild(current, 0);
      node.setParent(child, 0);

      this.#root = child;
      this.#release(current, orphans);

      return;
    }

    if (current === this.#root && !node.isLeaf(current) && node.getSize(current) === 0) {
      node.createEmpty(current, 0);
      return;
    }

    this.#adjustTree(current);
  }

  #attachNode(ptr: Ptr32) {
    const node = this.#node;
    const parentLevel = node.getSize(ptr) === 0 ? 0 : node.getLevel(ptr) + 1;

    while (node.getLevel(this.#root) < parentLevel) {
      this.#growRoot();
    }

    const [minX, minY, maxX, maxY] = node.getBBox(ptr);
    const parent = this.#chooseNode(this.#root, minX, minY, maxX, maxY, parentLevel);

    node.pushChild(parent, ptr);
    this.#adjustTree(parent);

    if (node.getSize(parent) >= this.maxEntries) {
      this.#splitNode(parent);
    }
  }

  #growRoot() {
    const node = this.#node;

    const oldRoot = this.#root;
    const newRoot = this.#createEmptyNode(node.getLevel(oldRoot) + 1);

    node.pushChild(newRoot, oldRoot);
    this.#root = newRoot;

    this.#updateBBox(newRoot);
  }

  #release(ptr: Ptr32, orphans?: Ptr32[]): Ptr32 {
    const last = this.#view.unpackPtr(this.size);

    if (ptr === last) {
      this.size--;
      return 0;
    }

    const node = this.#node;
    const parent = node.getParent(last);

    // Двигаем последний узел на место удаленного
    const words = this.#view.uints32;
    words.copyWithin(ptr, last, last + BLOCKS32_PER_ELEMENT);

    // В ptr уже лежит последний узел, а не удалённый, но родитель всё ещё ссылается на last
    if (parent !== 0 && parent !== ptr && node.removeChild(parent, last)) {
      node.pushChild(parent, ptr);

    // Последний узел был ребёнком освобождаемого слота либо без родителя
    } else {
      node.setParent(ptr, 0);
    }

    // Теперь правим ссылку на родителя для детей ptr
    node.forEachChild(ptr, (childPtr) => {
      node.setParent(childPtr, ptr);
    });

    if (this.#root === last) {
      this.#root = ptr;
    }

    if (orphans != null) {
      for (let i = 0; i < orphans.length; i++) {
        if (orphans[i] === last) {
          orphans[i] = ptr;
          break;
        }
      }
    }

    this.size--;
    return last;
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
