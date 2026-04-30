import type { BinType } from "#/bindata/bintype";

export type Size<T extends readonly BinType[], Acc extends number = 0> =
  T extends readonly [infer First extends BinType, ...infer Rest extends BinType[]]
    ? Tb.Add<Acc, First["size"]> extends number ? Size<Rest, Tb.Add<Acc, First["size"]>> : Acc
    : Acc;

export type Aliases<
  Elems extends BinType[],
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  R = {}
> = Elems["length"] extends 0 ?
  R :
  Aliases<Tb.Tail<Elems>, R & { [K in Exclude<Tb.Head<Elems>["alias"], null | undefined>]: number }>
