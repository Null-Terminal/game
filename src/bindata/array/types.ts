import type { BinType } from "#/bindata/bintype";

export interface Array<
  Name extends string = string,
  Elem extends BinType = BinType,
  Length extends number = number,
  Alias extends string = Name
> extends BinType<Name, Tb.Mult<Elem["size"], Length>, Alias> {
  readonly element: Elem;
  readonly length: Length;
}
