export function createMask<T extends number | bigint>(size: T): T;
export function createMask(size: number | bigint): number | bigint {
  return typeof size === "number" ? (1 << size) - 1 : (1n << size) - 1n;
}
