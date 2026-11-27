import { cast } from "#/utils/cast";

import type { BinType } from "#lib/bindata/bintype";
import type { Array } from "#lib/bindata/array/types";

export type { Array } from "#lib/bindata/array/types";

export function array<const N extends string, const L extends number, E extends BinType>(
  name: N,
  element: E,
  length: L,
): Array<N, E, L> {
  const size = element.size * length;

  return {
    name,
    alias: name,

    element,
    length,

    size: cast(size)
  };
}
