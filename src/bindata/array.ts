import { cast } from "#/tstools";

import type { BinType } from "#/bindata/bintype";
import type { Array } from "#/bindata/array/types";

export type { Array } from "#/bindata/array/types";

export function array<const N extends string, const S extends number, E extends BinType>(
  name: N,
  element: E,
  size: S,
): Array<N, E, S> {
  return {
    name,
    element,
    size: cast(element.size * size),
    alias: name
  };
}
