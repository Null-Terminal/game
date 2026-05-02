export interface BinType<
  Type extends string = string,
  Size extends number = number,
  Alias extends string = Type
> {
  type: Type;
  size: Size;
  alias: Alias
}

export function bintype<const T extends string, const S extends number>(type: T, size: S): BinType<T, S> {
  return { type, alias: type, size };
}

export function alias<const A extends string, T extends BinType>(alias: A, bintype: T): BinType<T["type"], T["size"], A> {
  return { ...bintype, alias };
}
