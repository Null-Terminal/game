import { mask } from "#/bindata/mask";

export function encodeToSmi<T extends number | bigint | boolean>(
  value: T,
  size: number,
  bitOffset: number
): T extends boolean ? number : T;

export function encodeToSmi(value: number | bigint | boolean, size: number, bitOffset: number): number | bigint {
  switch (typeof value) {
    case "number": return value & mask(size) << bitOffset;
    case "bigint": return value & BigInt(mask(size)) << BigInt(bitOffset);
    case "boolean": return Number(value) & mask(size) << bitOffset;
  }
}
