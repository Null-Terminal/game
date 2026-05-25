import { alias, tuple, usize } from "#/bindata";
import type { PoolPointer } from "#engine/game-object-pool";

import { BinView } from "#engine/rtree/binview";
import type { Ptr32 } from "#engine/rtree/types";

export type DataPointer = PoolPointer;

export const data = tuple("data", [
  alias("kind", usize),
  alias("index", usize),
  alias("_", usize),
]);

const { offsets32 } = data;

export class Data extends BinView {
  static readonly Scheme = data;
  static override readonly BYTES_PER_ELEMENT = this.Scheme.size;

  get(ptr: Ptr32): DataPointer {
    const { uints32 } = this.view;
    return [uints32[ptr + offsets32.kind]!, uints32[ptr + offsets32.index]!];
  }

  set(ptr: Ptr32, kind: number, index: number) {
    const { uints32 } = this.view;
    uints32[ptr + offsets32.kind] = kind;
    uints32[ptr + offsets32.index] = index;
  }
}
