import { cast } from "#/tstools";

import type { BinType } from "#/bindata/bintype";
import type { Tuple, IndexedBinType } from "#/bindata/tuple/types";

export type { Tuple, IndexedBinType } from "#/bindata/tuple/types";

export function tuple<const N extends string, const E extends BinType[]>(
  name: N,
  elements: E
): Tuple<N, E> {
  type SizesOrOffsets = Record<string | number, number>;

  const at: Record<string | number, IndexedBinType<BinType>> = {};
  const sizes: SizesOrOffsets = {};

  const offsets8: SizesOrOffsets = {};
  const offsets16: SizesOrOffsets = {};
  const offsets32: SizesOrOffsets = {};

  let size = 0;

  for (const [i, elem] of elements.entries()) {
    at[i] = { ...elem, index: i };
    at[elem.alias] = { ...elem, index: i };

    sizes[i] = elem.size;
    sizes[elem.alias] = elem.size;

    offsets8[i] = size;
    offsets8[elem.alias] = size;

    offsets8[i] = size;
    offsets8[elem.alias] = size;

    const offset16 = Math.floor(size / 2);

    offsets16[i] = offset16;
    offsets16[elem.alias] = offset16;

    const offset32 = Math.floor(size / 4);

    offsets32[i] = offset32;
    offsets32[elem.alias] = offset32;

    size += elem.size;
  }

  return {
    name,
    alias: name,
    size: cast(size),

    at: cast(at),
    sizes: cast(sizes),

    offsets8: cast(offsets8),
    offsets16: cast(offsets8),
    offsets32: cast(offsets32),
  };
}
