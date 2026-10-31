import { ServantObject } from "#engine/game-objects/servant-object";

type Destroyable = {
  readonly destroyed: boolean;
};

type WithStatus = {
  readonly status: { readonly shadowed: boolean };
};

function getScope(value: Destroyable | ServantObject): string {
  return value instanceof ServantObject ?
    `${value.go.name}.${value.constructor.name}` :
    value.constructor.name;
}

export function ifAlive<This extends Destroyable | ServantObject, Args extends unknown[], Result>(
  target: (this: This, ...args: Args) => Result,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Result>,
) {
  const name = String(context.name);

  return function (this: This, ...args: Args): Result {
    const owner = this instanceof ServantObject ? this.go : this;

    if (owner.destroyed) {
      throw new Error(`${getScope(this)}.${name}: called on destroyed object`);
    }

    return target.call(this, ...args);
  };
}

export function ifDead<This extends Destroyable | ServantObject, Args extends unknown[], Result>(
  target: (this: This, ...args: Args) => Result,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Result>,
) {
  const name = String(context.name);

  return function (this: This, ...args: Args): Result {
    const owner = this instanceof ServantObject ? this.go : this;

    if (!owner.destroyed) {
      throw new Error(`${getScope(this)}.${name}: called on a live object`);
    }

    return target.call(this, ...args);
  };
}

export function ifShadowed<ReturnValue = undefined>(returnValue?: ReturnValue) {
  return function <This extends WithStatus | ServantObject, Args extends unknown[], Result>(
    target: (this: This, ...args: Args) => Result,
  ) {
    return function (this: This, ...args: Args): Result {
      const owner = this instanceof ServantObject ? this.go : this;

      if (owner.status.shadowed) {
        return returnValue as Result;
      }

      return target.call(this, ...args);
    };
  };
}
