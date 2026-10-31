import { ServantObject } from "#engine/game-objects/servant-object";

import type { GameObject } from "#engine/game-objects/game-object";
import type * as t from "#engine/game-objects/game-object/movement/types";

export type * from "#engine/game-objects/game-object/movement/types";

export class Movement extends ServantObject {
  #cancelMovementHandler: Destructor | null = null;

  constructor(go: GameObject) {
    super(go);
  }

  follow(movement: t.MovementOptions) {
    this.reset();

    if ("path" in movement) {
      this.#followPath(movement.path, movement);
      return;
    }

    if ("at" in movement) {
      this.#followAt(movement.at, movement.speed);
      return;
    }

    if ("sine" in movement) {
      this.#followSine(movement.sine);
      return;
    }

    if ("circle" in movement) {
      this.#followCircle(movement.circle);
      return;
    }

    throw new TypeError(`${this.constructor.name}.follow: unknown movement`);
  }

  reset() {
    this.#cancelMovementHandler?.();
    this.#cancelMovementHandler = null;
  }

  #followPath(path: t.MovePath, { tolerance = 5, speed = 100 }: Pick<t.PathMovement, "tolerance" | "speed">) {
    if (path.length === 0) {
      return;
    }

    const go = this.go;

    let pathIndex = 0;
    let elapsed = 0;

    this.#drive((delta) => {
      elapsed += delta;

      const target = path[pathIndex]!;

      const dx = target[0] - go.x;
      const dy = target[1] - go.y;

      const distance = Math.hypot(dx, dy);

      if (distance < tolerance) {
        // Достигли цели - переключаемся на следующую
        pathIndex = (pathIndex + 1) % path.length;
        // move(0, 0) обновляет prev, чтобы стоящий сверху не получил этот шаг ещё раз
        go.move(0, 0);
        return;
      }

      const step = this.#velocity(speed ?? 100, elapsed) * delta;
      const ratio = Math.min(1, step / distance);

      go.move(dx * ratio, dy * ratio);
    });
  }

  #followAt(at: (distance: number) => t.MovePoint, speed?: t.MoveSpeed) {
    const go = this.go;

    let elapsed = 0;
    let distance = 0;

    this.#drive((delta) => {
      if (go.status.paused) {
        go.move(0, 0);
        return;
      }

      elapsed += delta;

      if (speed != null) {
        const [x, y] = at(distance);

        const probe = distance + 0.001;
        const [nx, ny] = at(probe);

        const derivative = Math.hypot(nx - x, ny - y) / 0.001;

        if (derivative > 0) {
          distance += this.#velocity(speed, elapsed) * delta / derivative;
        }

      } else {
        distance = elapsed;
      }

      const [x, y] = at(distance);
      go.move(x - go.x, y - go.y);
    });
  }

  #velocity(speed: t.MoveSpeed, elapsed: number) {
    return typeof speed === "function" ? speed(elapsed) : speed;
  }

  #followSine({ axis = "x", amplitude, length, period, speed, origin }: t.Sine) {
    if (period <= 0) {
      return;
    }

    const go = this.go;
    const [originX, originY] = origin ?? [go.x, go.y];

    this.#followAt((t) => {
      const cycle = (t % period) / period;
      const ping = cycle <= 0.5 ? cycle * 2 : (1 - cycle) * 2;

      const along = ping * length;
      const across = Math.sin(ping * Math.PI * 2) * amplitude;

      return axis === "x"
        ? [originX + along, originY + across]
        : [originX + across, originY + along];
    }, speed);
  }

  #followCircle({ center, radius, period, speed }: t.Circle) {
    if (period <= 0) {
      return;
    }

    const [centerX, centerY] = center;

    this.#followAt((t) => {
      const angle = t * Math.PI * 2 / period;
      return [centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius];
    }, speed);
  }

  #drive(step: (delta: number) => void) {
    const go = this.go;

    this.#cancelMovementHandler = go.render.on(go.redrawEvent, ({ delta }) => {
      step(delta);
    });
  }
}
