import type { BinType } from "#/bindata/bintype";

export type IndexedBinType<T extends BinType> = T & { index: number };

export interface Tuple<
  Name extends string = string,
  Elems extends BinType[] = [],
  Alias extends string = Name
> extends BinType<Name, Size<Elems>, Alias> {
  readonly at: Aliases<Elems> & { [K in keyof Elems]?: IndexedBinType<Elems[K]> };
  readonly sizes: SizesOrOffsets<Elems>;
  readonly offsets8: SizesOrOffsets<Elems>;
  readonly offsets16: SizesOrOffsets<Elems>;
  readonly offsets32: SizesOrOffsets<Elems>;
}

type Size<T extends readonly BinType[], Acc extends number = 0> =
  T extends readonly [infer First extends BinType, ...infer Rest extends BinType[]]
    ? Tb.Add<Acc, First["size"]> extends number ? Size<Rest, Tb.Add<Acc, First["size"]>> : Acc
    : Acc;

type Aliases<E extends BinType[], R = {}> = {
  "Result": R;
  "Recursive": Aliases<Tb.Tail<E>, R & { readonly [K in Tb.Head<E>["alias"]]: IndexedBinType<Tb.Head<E>> }>
}[E["length"] extends 0 ? "Result" : "Recursive"];

type SizesOrOffsets<E extends BinType[], R = {}> = {
  "Result": R;
  "Recursive": SizesOrOffsets<Tb.Tail<E>, R & { readonly [K in Tb.Head<E>["alias"]]: number } & { readonly [key: number]: number }>
}[E["length"] extends 0 ? "Result" : "Recursive"];
