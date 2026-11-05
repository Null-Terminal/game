import type { RTreeView } from "#engine/rtree/types";

export function createRTreeView(): RTreeView {
  const buffer = new ArrayBuffer(4096);

  return {
    uints8: new Uint8Array(buffer),
    uints16: new Uint16Array(buffer),
    uints32: new Uint32Array(buffer),
    floats32: new Float32Array(buffer),
    packPtr: (ptr) => ptr,
    unpackPtr: (ptr) => ptr
  };
}
