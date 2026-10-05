type Destroyable = {
  readonly destroyed: boolean;
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
