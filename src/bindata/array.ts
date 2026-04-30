import { type BinType } from "#/bindata/bintype";

export function array<const T extends string, const S extends number, E extends BinType>(
  type: T,
  element: E,
  size: S,
): BinType<T, Tb.Mult<E["size"], S>> {
  return {
    type,
    size: (element.size * size) as any
  };
}
