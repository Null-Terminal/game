import type { BinType } from "#/bindata/bintype";

export type IndexedBinType<T extends BinType> = T & { index: number };

export interface Tuple<
  Type extends string = string,
  Elems extends BinType[] = [],
  Alias extends string = Type
> extends BinType<Type, Size<Elems>, Alias> {
  at: Aliases<Elems> & { [K in keyof Elems]?: IndexedBinType<Elems[K]> };
  sizes: SizesOrOffsets<Elems>;
  offsets8: SizesOrOffsets<Elems>;
  offsets32: SizesOrOffsets<Elems>;
  offsets32Bit: SizesOrOffsets<Elems>;
}

type Size<T extends readonly BinType[], Acc extends number = 0> =
  T extends readonly [infer First extends BinType, ...infer Rest extends BinType[]]
    ? Tb.Add<Acc, First["size"]> extends number ? Size<Rest, Tb.Add<Acc, First["size"]>> : Acc
    : Acc;

type Aliases<E extends BinType[], R = {}> = {
  "Result": R;
  "Recursive": Aliases<Tb.Tail<E>, R & { [K in Tb.Head<E>["alias"]]: IndexedBinType<Tb.Head<E>> }>
}[E["length"] extends 0 ? "Result" : "Recursive"];

type SizesOrOffsets<E extends BinType[], R = {}> = {
  "Result": R;
  "Recursive": SizesOrOffsets<Tb.Tail<E>, R & { [K in Tb.Head<E>["alias"]]: number } & { [key: number]: number }>
}[E["length"] extends 0 ? "Result" : "Recursive"];
