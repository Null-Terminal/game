import { GameObject } from "#engine/game-objects/game-object";
import type { MovePath, MoveAlongPathOptions } from "#engine/game-objects/movement/types";

export type * from  "#engine/game-objects/movement/types";

export class Movement {
  readonly #go;

  #cancelMovementHandler: Function | null = null;

  constructor(gameObject: GameObject) {
    this.#go = gameObject;
  }

  moveAlongPath(path: MovePath, { tolerance = 5, speed = 100 }: MoveAlongPathOptions = {}) {
    const go = this.#go;

    this.#cancelMovementHandler?.();

    if (path.length === 0) {
      return;
    }

    let pathIndex = 0;

    this.#cancelMovementHandler = go.register(go.canvas.emitter.on(go.redrawEvent, ({ delta }) => {
      const target = path[pathIndex]!;

      const dx = target[0] - go.x;
      const dy = target[1] - go.y;

      const distance = Math.hypot(dx, dy);

      if (distance < tolerance) {
        // Достигли цели - переключаемся на следующую
        pathIndex = (pathIndex + 1) % path.length;
        return;
      }

      const step = speed * delta;
      const ratio = Math.min(1, step / distance);

      go.move(dx * ratio, dy * ratio);
    }));
  }
}
