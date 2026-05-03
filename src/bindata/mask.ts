export function mask<T extends number | bigint>(size: T): T;
export function mask(size: number | bigint): number | bigint {
  return typeof size === "number" ? (1 << size) - 1 : (1n << size) - 1n;
}
