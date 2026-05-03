export interface BinType<
  Name extends string = string,
  Size extends number = number,
  Alias extends string = Name
> {
  name: Name;
  size: Size;
  alias: Alias;
}
