import { createMask } from "#/bindata/mask";

export function encodeToSmi(value: number | boolean, size: number, bitOffset: number): number {
  switch (typeof value) {
    case "number": return value & createMask(size) << bitOffset;
    case "boolean": return Number(value) & createMask(size) << bitOffset;
  }
}

export function decodeFromSmi(value: number, size: number, bitOffset: number): number {
  return (value >> bitOffset) & createMask(size);
}
