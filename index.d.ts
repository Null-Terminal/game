interface Uint8Array {
  toBase64(options?: { alphabet?: "base64" | "base64url"; omitPadding?: boolean }): string;
  toHex(): string;
}

namespace Tb {
  export type Head<T extends any[]> = T extends [infer H, ...any] ? H : never;
  export type Tail<T extends any[]> = T extends [any, ...infer Tail] ? Tail : [];

  export type Add<A extends number, B extends number> =
    [...BuildTuple<A>, ...BuildTuple<B>]["length"];

  export type Mult<A extends number, B extends number, R extends number = A, I extends any[] = [any]> =
    I["length"] extends B ? R :
      Add<R, A> extends number ? Mult<A, B, Add<R, A>, [...I, any]> : A;

  export type BuildTuple<N extends number, Acc extends unknown[] = []> =
    Acc["length"] extends N ? Acc : BuildTuple<N, [...Acc, unknown]>;
}
