import type { BinType } from "#/bindata/bintype/types";

export type { BinType } from "#/bindata/bintype/types";

export function bintype<const N extends string, const S extends number>(
  name: N,
  size: S
): BinType<N, S> {
  return {
    name,
    alias: name,
    size
  };
}

export function alias<const A extends string, T extends BinType>(
  alias: A,
  bintype: T
): BinType<T["name"], T["size"], A> {
  return { ...bintype, alias };
}
