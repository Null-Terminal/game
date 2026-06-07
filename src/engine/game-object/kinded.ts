import { cache } from "#decorators/cache";

const kinds = new Map<number, string>();

export abstract class KindedObject {
  @cache
  static get kind() {
    const name = this.name;

    let hash = 0;

    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0; // 32-битное усечение
    }

    hash = Math.abs(hash);

    if (kinds.has(hash)) {
      throw new Error(
        `${this.constructor.name}: Kind collision: "${name}" and "${kinds.get(hash)}" both have kind ${hash}`
      );
    }

    kinds.set(hash, name);

    return hash;
  }
}
