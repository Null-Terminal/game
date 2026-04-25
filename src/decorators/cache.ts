export function cache<This, Value>(target: (this: This) => Value) {
  const key = Symbol();

  return function (this: This) {
    const store = this as Record<symbol, Value>;

    if (Object.hasOwn(store, key)) {
      return store[key]!;
    }

    const value = target.call(this);

    Object.defineProperty(store, key, {
      value,
      enumerable: false,
      configurable: true,
      writable: true
    });

    return value;
  };
}
