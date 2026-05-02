import { alias, array, tuple, bintype, usize2, u8, bool } from "#/bindata";

import { bbox, BBox } from "#engine/rtree/bbox";

const node = tuple("RTreeNode", [
  bbox,
  alias("length", u8),
  array("children", usize2, 16),
  alias("parent", usize2),
  alias("level", u8),
  alias("leaf", bool),
  bintype("data", 11)
]);

export class RTreeNode {
  static SCHEME = node;
  static BYTES_PER_ELEMENT: 64 = node.size;

  static bbox(data: Float32Array, offset: number) {
    return new BBox(data, offset + node.at.bbox);
  }
}
