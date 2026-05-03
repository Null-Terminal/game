import type { BinType } from "#/bindata/bintype";

export interface Array<
  Name extends string = string,
  Elem extends BinType = BinType,
  Size extends number = number,
  Alias extends string = Name
> extends BinType<Name, Tb.Mult<Elem["size"], Size>, Alias> {
  readonly element: Elem;
}
