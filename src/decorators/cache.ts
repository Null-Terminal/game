export function cache<This, Value>(target: (this: This) => Value) {
  const key = Symbol();

  return function (this: This) {
    return (this as Record<symbol, Value>)[key] ??= target.call(this);
  };
}
