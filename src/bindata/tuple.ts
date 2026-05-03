import { cast } from "#/tstools";

import type { BinType } from "#/bindata/bintype";
import type { Tuple, IndexedBinType } from "#/bindata/tuple/types";

export type { Tuple, IndexedBinType } from "#/bindata/tuple/types";

export function tuple<const T extends string, const E extends BinType[]>(
  name: T,
  elements: E
): Tuple<T, E> {
  type SizesOrOffsets = Record<string | number, number>;

  const at: Record<string | number, IndexedBinType<BinType>> = {};
  const sizes: SizesOrOffsets = {};

  const offsets8: SizesOrOffsets = {};
  const offsets32: SizesOrOffsets = {};
  const offsets32Bit: SizesOrOffsets = {};

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

    const offset32 = Math.floor(size / 32);

    offsets32[i] = offset32;
    offsets32[elem.alias] = offset32;

    const offset32Bit = size % 32;

    offsets32Bit[i] = offset32Bit;
    offsets32Bit[elem.alias] = offset32Bit;

    size += elem.size;
  }

  return {
    name,
    size: cast(size),
    alias: name,

    at: cast(at),
    sizes: cast(sizes),

    offsets8: cast(offsets8),
    offsets32: cast(offsets32),
    offsets32Bit: cast(offsets32Bit),
  };
}
