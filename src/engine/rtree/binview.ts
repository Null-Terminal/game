import type { RtreeView } from "#engine/rtree/types";

export class BinView {
  static readonly BYTES_PER_ELEMENT: number = 0;

  get buffer() {
    return this.view.blocks.buffer;
  }

  get byteLength() {
    return this.view.blocks.byteLength;
  }

  get byteOffset() {
    return this.view.blocks.byteOffset;
  }

  readonly BYTES_PER_ELEMENT: number;

  protected readonly view: RtreeView;

  constructor(view: RtreeView) {
    this.view = view;
    this.BYTES_PER_ELEMENT = (this.constructor as typeof BinView).BYTES_PER_ELEMENT;
  }
}
