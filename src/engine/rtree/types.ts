export interface RtreeView {
  uints8: Uint8Array;
  uints16: Uint16Array;
  uints32: Uint32Array;
  floats32: Float32Array;
  packPtr(ptr: Ptr32): number;
  unpackPtr(ptr: number): Ptr32;
}

export type Ptr32 = number & {};

export type Ptr32To16 = number & {};
