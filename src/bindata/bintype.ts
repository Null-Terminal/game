export interface BinType<Type extends string = any, Size extends number = any, Alias extends string = string> {
  type: Type;
  size: Size;
  alias?: Alias;
}

export function bintype<const T extends string, const S extends number>(type: T, size: S): BinType<T, S> {
  return { type, size };
}

export function alias<const A extends string, T extends BinType>(alias: A, bintype: T): BinType<T["type"], T["size"], A> {
  return { ...bintype, alias };
}
