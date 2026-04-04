import type { SpriteDescriptor } from "#sprite-buffer/types";

const U8 = Uint8Array.BYTES_PER_ELEMENT;
const U16 = Uint16Array.BYTES_PER_ELEMENT;
const UTF8_6 = U8 * 6;

export class SpriteBuffer {
  static readonly SCHEME = new Map([
    ["x", U16],
    ["y", U16],
    ["width", U16],
    ["height", U16],
    ["delay", U16],
    ["id", UTF8_6],
  ] as const);

  static readonly BYTES_PER_ELEMENT = this.SCHEME.values()
    .reduce((acc, size) => acc + size, 0);

  readonly BYTES_PER_ELEMENT = SpriteBuffer.BYTES_PER_ELEMENT;

  static readonly ID_SIZE = this.SCHEME.get("id")!;
  static readonly ID_OFFSET = this.BYTES_PER_ELEMENT - this.ID_SIZE;
  static readonly NUMS_SIZE = (this.BYTES_PER_ELEMENT - this.ID_SIZE) / 2;

  get buffer() {
    return this.#bytes.buffer;
  }

  get byteLength() {
    return this.#bytes.byteLength;
  }

  get byteOffset() {
    return this.#byteOffset;
  }

  get spriteId() {
    return this.#cachedId ??= new TextDecoder().decode(this.#id).trim();
  }

  set spriteId(value: string) {
    const size = SpriteBuffer.ID_SIZE;

    this.#id.set(
      new TextEncoder().encode(
        value
          .slice(0, size)
          .padEnd(size, " "))
    );

    this.#cachedId = null;
  }

  get x() {
    return this.#nums[0]!;
  }

  set x(value: number) {
    this.#nums[0] = value;
  }

  get y() {
    return this.#nums[1]!;
  }

  set y(value: number) {
    this.#nums[1] = value;
  }

  get width() {
    return this.#nums[2]!;
  }

  set width(value: number) {
    this.#nums[2] = value;
  }

  get height() {
    return this.#nums[3]!;
  }

  set height(value: number) {
    this.#nums[3] = value;
  }

  get animationDelay() {
    return this.#nums[4]!;
  }

  set animationDelay(value: number) {
    this.#nums[4] = value;
  }

  #id;
  #cachedId: string | null = null;

  #nums;
  #bytes;
  #byteOffset;

  constructor(bytes: Uint8Array, offset = bytes.byteOffset) {
    this.#bytes = bytes;
    this.#byteOffset = offset;

    const c = SpriteBuffer;

    this.#id = new Uint8Array(bytes.buffer, offset + c.ID_OFFSET, c.ID_SIZE);
    this.#nums = new Uint16Array(bytes.buffer, offset, c.NUMS_SIZE);
  }

  getDescriptor(): SpriteDescriptor {
    return {
      x: this.x,
      y: this.y,

      width: this.width,
      height: this.height,

      spriteId: this.spriteId,
      animationDelay: this.animationDelay,
    };
  }
}
