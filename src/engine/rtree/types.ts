import type { BBoxTuple } from "#engine/rtree/bbox";
import type { DataPointer } from "#engine/rtree/data";

export interface RTreePublicNode {
  bbox: BBoxTuple;
  pointer: DataPointer;
}

export interface RTreeView {
  uints8: Uint8Array;
  uints16: Uint16Array;
  uints32: Uint32Array;
  floats32: Float32Array;
  packPtr(ptr: Ptr32): number;
  unpackPtr(ptr: number): Ptr32;
}

export type Ptr32 = number & {};

export type Ptr32To16 = number & {};
