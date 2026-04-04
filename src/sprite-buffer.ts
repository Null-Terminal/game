const U8 = Uint8Array.BYTES_PER_ELEMENT;
const I16 = Int16Array.BYTES_PER_ELEMENT;
const UTF8_6 = U8 * 6;

export class SpriteBuffer {
  static readonly SCHEME = new Map([
    ["x", I16],
    ["y", I16],
    ["width", I16],
    ["height", I16],
    ["delay", I16],
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
    this.#nums = new Int16Array(bytes.buffer, offset, c.NUMS_SIZE);
  }

  get id() {
    return this.#cachedId ??= new TextDecoder().decode(this.#id).trim();
  }

  set id(value: string) {
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

  get delay() {
    return this.#nums[4]!;
  }

  set delay(value: number) {
    this.#nums[4] = value;
  }
}
