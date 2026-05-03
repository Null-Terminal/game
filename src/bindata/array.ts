import { cast } from "#/tstools";

import { type BinType } from "#/bindata/bintype";

export function array<const N extends string, const S extends number, E extends BinType>(
  name: N,
  element: E,
  size: S,
): BinType<N, Tb.Mult<E["size"], S>> {
  return {
    name,
    size: cast(element.size * size),
    alias: name
  };
}
