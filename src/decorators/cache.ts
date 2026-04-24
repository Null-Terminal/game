export function cache<This, Value>(target: (this: This) => Value) {
  const key = Symbol();

  return function (this: This) {
    const store = this as Record<symbol, Value>;

    if (key in store) {
      return store[key];
    }

    return store[key] = target.call(this);
  };
}
