type Destroyable = {
  readonly destroyed: boolean;
};

type WithStatus = {
  readonly status: { readonly shadowed: boolean };
};

export function ifAlive<This extends Destroyable, Args extends unknown[], Result>(
  target: (this: This, ...args: Args) => Result,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Result>,
) {
  const name = String(context.name);

  return function (this: This, ...args: Args): Result {
    if (this.destroyed) {
      throw new Error(`${this.constructor.name}.${name}: called on destroyed object`);
    }

    return target.call(this, ...args);
  };
}

export function ifShadowed<ReturnValue = undefined>(returnValue?: ReturnValue) {
  return function <This extends WithStatus, Args extends unknown[], Result>(
    target: (this: This, ...args: Args) => Result,
  ) {
    return function (this: This, ...args: Args): Result {
      if (this.status.shadowed) {
        return returnValue as Result;
      }

      return target.call(this, ...args);
    };
  };
}
