export interface BinType<
  Name extends string = string,
  Size extends number = number,
  Alias extends string = Name
> {
  readonly name: Name;
  readonly alias: Alias;
  readonly size: Size;
}
