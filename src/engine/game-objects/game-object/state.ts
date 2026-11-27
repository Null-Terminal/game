import { ServantObject } from "#engine/game-objects/servant-object";

import type { GameObject } from "#engine/game-objects/game-object";
import type { StatePart, StateValue } from "#engine/game-objects/game-object/state/types";

export type * from "#engine/game-objects/game-object/state/types";

interface RegisteredStatePart {
  save(): StateValue;
  prepare(value: unknown): () => void;
}

export class GameObjectState<T extends GameObject = GameObject> extends ServantObject<T> {
  readonly #parts = new Map<string, RegisteredStatePart>();

  constructor(go: T) {
    super(go);
  }

  add<V extends StateValue>(key: string, part: StatePart<V>) {
    if (key.length === 0 || this.#parts.has(key)) {
      throw new Error(`${this.go.name}.state.add: invalid or duplicate key "${key}"`);
    }

    this.#parts.set(key, {
      save: () => part.save(),
      prepare: (value) => {
        if (!part.validate(value)) {
          throw new TypeError(`${this.go.name}.state.restore: invalid "${key}"`);
        }

        return () => part.restore(value);
      }
    });
  }

  save(): Record<string, StateValue> {
    const snapshot: Record<string, StateValue> = {};

    for (const [key, part] of this.#parts) {
      snapshot[key] = part.save();
    }

    return snapshot;
  }

  restore(value: StateValue) {
    if (typeof value !== "object" || value == null || Array.isArray(value)) {
      throw new TypeError(`${this.go.name}.state.restore: expected an object`);
    }

    for (const key of Object.keys(value)) {
      if (!this.#parts.has(key)) {
        throw new TypeError(`${this.go.name}.state.restore: unknown "${key}"`);
      }
    }

    const apply: (() => void)[] = [];

    for (const [key, part] of this.#parts) {
      if (Object.hasOwn(value, key)) {
        apply.push(part.prepare(value[key]));
      }
    }

    for (const restore of apply) {
      restore();
    }
  }
}
