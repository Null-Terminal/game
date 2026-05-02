import { cast } from "#/tstools";

import type { BinType } from "#/bindata/bintype";
import type { Size, Aliases, Offsets } from "#/bindata/types";

export interface Tuple<
  Type extends string = string,
  Elems extends BinType[] = [],
  Alias extends string = Type
> extends BinType<Type, Size<Elems>, Alias> {
  at: Aliases<Elems> & { [K in keyof Elems]?: Elems[K] };
  offset8: Offsets<Elems>;
  offset32: Offsets<Elems>;
  offset32Bit: Offsets<Elems>;
}

export function tuple<const T extends string, const E extends BinType[]>(
  type: T,
  elements: E
): Tuple<T, E> {
  type Offsets = Record<string | number, number>;

  const offset8: Offsets = {};
  const offset32: Offsets = {};
  const offset32Bit: Offsets = {};

  const at: Record<string | number, number | BinType> = {};

  let size = 0;

  for (const [i, elem] of elements.entries()) {
    offset8[elem.alias] = size;
    offset8[i] = size;

    const offset32Value = Math.floor(size / 32);

    offset32[elem.alias] = offset32Value;
    offset32[i] = offset32Value;

    const offset32BitValue = size % 32;

    offset32Bit[elem.alias] = offset32BitValue;
    offset32Bit[i] = offset32BitValue;

    at[elem.alias] = i;
    at[i] = elem;

    size += elem.size;
  }

  return {
    type,
    alias: type,
    size: cast(size),
    offset8: cast(offset8),
    offset32: cast(offset32),
    offset32Bit: cast(offset32Bit),
    at: cast(at),
  };
}
