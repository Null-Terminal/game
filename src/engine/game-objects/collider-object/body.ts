import { ifAlive } from "#engine/game-objects/decorators";
import { ServantObject } from "#engine/game-objects/servant-object";
import type { ColliderObject } from "#engine/game-objects/collider-object";
import type { BBoxTuple, RTree, RTreeEntry } from "#engine/rtree";

export type CollisionShape = () => BBoxTuple | null;

enum Kind {
  // Твёрдое препятствие для движения других объектов
  Solid,

  // Область, вызывающая взаимодействие при контакте
  Interact,
}

enum Mode {
  // Коллайдер хранится в постоянном дереве
  Static,

  // Коллайдер обновляется в дереве каждый кадр
  Dynamic,
}

export class CollisionBody extends ServantObject<ColliderObject> {
  static readonly Kind = Kind;

  // Время простоя перед возвратом в статическое дерево
  static readonly IDLE_SECONDS = 1;

  readonly #shapes: CollisionShape[] = [];
  readonly #entries: (RTreeEntry | null)[] = [];

  #kind = Kind.Solid;
  #mode = Mode.Static;

  #lastX = 0;
  #lastY = 0;

  #idleSeconds = 0;
  #moved = false;
  #mounted = false;
  #sleeping = false;

  constructor(go: ColliderObject) {
    super(go);
  }

  get kind() {
    return this.#kind;
  }

  toSolid() {
    this.#set(Kind.Solid);
  }

  toInteract() {
    this.#set(Kind.Interact);
  }

  @ifAlive
  addShape(shape: CollisionShape) {
    this.#shapes.push(shape);
    this.#entries.push(null);

    if (this.#mounted && this.#mode === Mode.Static && !this.#sleeping) {
      this.#syncStatic();
    }
  }

  mount() {
    const { go } = this;

    if (!(go.width > 0 && go.height > 0)) {
      throw new RangeError(`${go.name}.create: collision needs width and height`);
    }

    this.#lastX = go.x;
    this.#lastY = go.y;

    this.#entries.unshift(null);
    this.#mounted = true;

    if (!this.#sleeping) {
      this.#syncStatic();
    }
  }

  moved() {
    const { go } = this;

    if (!this.#mounted) {
      return;
    }

    if (go.x === this.#lastX && go.y === this.#lastY) {
      return;
    }

    this.#lastX = go.x;
    this.#lastY = go.y;
    this.#idleSeconds = 0;
    this.#moved = true;

    if (this.#mode === Mode.Static) {
      this.#removeStatic();
      this.#mode = Mode.Dynamic;
    }
  }

  geometryChanged() {
    if (this.#mounted && this.#mode === Mode.Static && !this.#sleeping) {
      this.#syncStatic();
    }
  }

  setSleeping(sleeping: boolean) {
    if (this.#sleeping === sleeping) {
      return;
    }

    this.#sleeping = sleeping;

    if (this.#mounted && this.#mode === Mode.Static) {
      if (sleeping) {
        this.#removeStatic();

      } else {
        this.#syncStatic();
      }
    }
  }

  flush(delta: number) {
    if (!this.#mounted || this.#mode === Mode.Static || this.#sleeping) {
      return;
    }

    this.#idleSeconds = this.#moved ? 0 : this.#idleSeconds + delta;
    this.#moved = false;

    if (this.#idleSeconds >= CollisionBody.IDLE_SECONDS) {
      this.#mode = Mode.Static;
      this.#syncStatic();
      return;
    }

    const { go } = this;

    const tree = this.#dynamicTree;
    go.world.addToWorld(go, tree);

    for (const shape of this.#shapes) {
      const bounds = shape();

      if (bounds != null) {
        tree.insert(...go.poolPointer, ...bounds);
      }
    }
  }

  reindex(index: number) {
    if (this.#mode !== Mode.Static) {
      return;
    }

    const tree = this.#staticTree;

    for (const entry of this.#entries) {
      if (entry != null && entry[1] !== index && tree.reindex(...entry, index)) {
        entry[1] = index;
      }
    }
  }

  destroy() {
    this.#removeStatic();
    this.#shapes.length = 0;
    this.#entries.length = 0;
    this.#kind = Kind.Solid;
    this.#mode = Mode.Static;
    this.#idleSeconds = 0;
    this.#moved = false;
    this.#mounted = false;
    this.#sleeping = false;
  }

  get #staticTree(): RTree {
    return this.#kind === Kind.Solid ? this.go.world.statics : this.go.world.staticInteracts;
  }

  get #dynamicTree(): RTree {
    return this.#kind === Kind.Solid ? this.go.world.dynamics : this.go.world.dynamicInteracts;
  }

  @ifAlive
  #set(kind: Kind) {
    if (this.#kind === kind) {
      return;
    }

    if (this.#mounted && this.#mode === Mode.Static && !this.#sleeping) {
      this.#removeStatic();
    }

    this.#kind = kind;

    if (this.#mounted && this.#mode === Mode.Static && !this.#sleeping) {
      this.#syncStatic();
    }
  }

  #syncStatic() {
    const { go } = this;

    const tree = this.#staticTree;
    const entries = this.#entries;

    entries[0] = go.world.addToWorld(go, tree, entries[0] ?? null);

    for (let index = 0; index < this.#shapes.length; index++) {
      const previous = entries[index + 1];
      const bounds = this.#shapes[index]!();

      if (previous != null && (bounds == null || previous.slice(2).some((value, i) => value !== bounds[i]))) {
        tree.remove(...previous);
        entries[index + 1] = null;
      }

      if (bounds != null && entries[index + 1] == null) {
        tree.insert(...go.poolPointer, ...bounds);
        entries[index + 1] = [...go.poolPointer, ...bounds];
      }
    }
  }

  #removeStatic() {
    const tree = this.#staticTree;
    const entries = this.#entries;

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];

      if (entry != null) {
        tree.remove(...entry);
        entries[index] = null;
      }
    }
  }
}
