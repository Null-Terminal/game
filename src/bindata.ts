import { bintype } from "#/bindata/bintype";

export { array } from "#/bindata/array";
export { tuple, type Tuple } from "#/bindata/tuple";
export { bintype, alias, type BinType } from "#/bindata/bintype";

export const bool = bintype("bool", 1);

export const u8 = bintype("u8", 1);
export const i8 = bintype("i8", 1);

export const u16 = bintype("u16", 2);
export const i16 = bintype("i16", 2);

export const u32 = bintype("u32", 4);
export const i32 = bintype("i32", 4);

export const u64 = bintype("u64", 8);
export const i64 = bintype("i64", 8);

export const f16 = bintype("f16", 2);
export const f32 = bintype("f32", 4);
export const f64 = bintype("f64", 8);

export const usize = bintype("usize", 4);
export const isize = bintype("isize", 4);

export const usize2 = bintype("usize2", 2);
export const isize2 = bintype("isize2", 2);
