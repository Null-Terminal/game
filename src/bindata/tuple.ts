import { type BinType } from "#/bindata/bintype";
import type { Size, Aliases } from "#/bindata/types";

export interface Tuple<
  Type extends string = any,
  Elems extends BinType[] = [],
  Alias extends string = Type
> extends BinType<Type, Size<Elems>, Alias> {
  at: Aliases<Elems> & { [K in keyof Elems]?: Elems[K] };
}

export function tuple<const T extends string, const E extends BinType[]>(
  type: T,
  elements: E
): Tuple<T, E> {
  return {
    type,

    alias: type,

    size: elements.reduce((sum, num) => sum + num.size, 0 as Size<E>),

    at: elements.reduce((map, elem, i) => {
      if (elem.alias != null) {
        map[elem.alias] = i;
      }

      map[i] = elem;
      return map;

    }, {} as Record<string | number, number | BinType>) as Tuple<T, E>["at"],
  };
}
