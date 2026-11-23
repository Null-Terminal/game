import { ServantObject } from "#engine/game-objects/servant-object";

import type { GameObject } from "#engine/game-objects/game-object";
import type * as t from "#engine/game-objects/game-object/movement/types";

export type * from "#engine/game-objects/game-object/movement/types";

export class Movement extends ServantObject {
  #cancelMovementHandler: Destructor | null = null;
  #progress: t.MovementSnapshot | null = null;
  #paused = false;

  get paused() {
    return this.#paused;
  }

  constructor(go: GameObject) {
    super(go);

    go.state.add("movement", {
      save: () => this.#save(),

      validate: (value): value is t.MovementSnapshot | null =>
        value === null || this.#isSnapshot(value),

      restore: (value) => {
        if (value != null) {
          this.#restore(value);
        }
      }
    });
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

  pause() {
    this.#paused = true;
  }

  resume() {
    this.#paused = false;
  }

  togglePause() {
    this.#paused = !this.#paused;
  }

  reset() {
    this.#cancelMovementHandler?.();
    this.#cancelMovementHandler = null;
    this.#progress = null;
    this.#paused = false;
  }

  #followPath(path: t.MovePath, { tolerance = 5, speed = 100 }: Pick<t.PathMovement, "tolerance" | "speed">) {
    if (path.length === 0) {
      return;
    }

    const go = this.go;

    const state: Extract<t.MovementSnapshot, { kind: "path" }> = {
      kind: "path",
      pathIndex: 0,
      elapsed: 0
    };

    this.#progress = state;

    this.#drive((delta) => {
      state.elapsed += delta;

      const target = path[state.pathIndex % path.length]!;

      const dx = target[0] - go.x;
      const dy = target[1] - go.y;

      const distance = Math.hypot(dx, dy);

      if (distance < tolerance) {
        // Достигли цели - переключаемся на следующую
        state.pathIndex = (state.pathIndex + 1) % path.length;
        go.move(dx, dy);
        return;
      }

      const step = this.#velocity(speed ?? 100, state.elapsed) * delta;
      const ratio = Math.min(1, step / distance);

      go.move(dx * ratio, dy * ratio);
    });
  }

  #followAt(at: (distance: number) => t.MovePoint, speed?: t.MoveSpeed) {
    const go = this.go;

    const state: Extract<t.MovementSnapshot, { kind: "curve" }> = {
      kind: "curve",
      elapsed: 0,
      distance: 0
    };

    this.#progress = state;

    this.#drive((delta) => {
      state.elapsed += delta;

      if (speed != null) {
        const [x, y] = at(state.distance);

        const probe = state.distance + 0.001;
        const [nx, ny] = at(probe);

        const derivative = Math.hypot(nx - x, ny - y) / 0.001;

        if (derivative > 0) {
          state.distance += this.#velocity(speed, state.elapsed) * delta / derivative;
        }

      } else {
        state.distance = state.elapsed;
      }

      const [x, y] = at(state.distance);
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

      return axis === "x" ?
        [originX + along, originY + across] :
        [originX + across, originY + along];
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

    this.#cancelMovementHandler = go.render.on(go.canvas.events.beforeRender, ({ delta }) => {
      if (!this.#paused) {
        step(delta);
      }
    });
  }

  #save(): t.MovementSnapshot | null {
    return this.#progress == null ? null : { ...this.#progress };
  }

  #isSnapshot(snapshot: unknown): snapshot is t.MovementSnapshot {
    const progress = this.#progress;

    if (progress == null || snapshot == null || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      return false;
    }

    if (!("kind" in snapshot) || snapshot.kind !== progress.kind) {
      return false;
    }

    const elapsed = "elapsed" in snapshot ? snapshot.elapsed : undefined;

    if (typeof elapsed !== "number" || !Number.isFinite(elapsed) || elapsed < 0) {
      return false;
    }

    if (progress.kind === "path") {
      const pathIndex = "pathIndex" in snapshot ? snapshot.pathIndex : undefined;
      return typeof pathIndex === "number" && Number.isInteger(pathIndex) && pathIndex >= 0;
    }

    const distance = "distance" in snapshot ? snapshot.distance : undefined;
    return typeof distance === "number" && Number.isFinite(distance) && distance >= 0;
  }

  #restore(snapshot: t.MovementSnapshot) {
    const progress = this.#progress!;
    progress.elapsed = snapshot.elapsed;

    if (progress.kind === "path" && snapshot.kind === "path") {
      progress.pathIndex = snapshot.pathIndex;

    } else if (progress.kind === "curve" && snapshot.kind === "curve") {
      progress.distance = snapshot.distance;
    }
  }
}
