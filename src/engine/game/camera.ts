import { Disposable } from "#engine/disposable";
import { isInRange } from "#/utils/validators";

import type { Game } from "#engine/game";
import type { PhysicsObject } from "#engine/game-objects";

import type { CameraDeadZone, CameraOptions } from "#engine/game/camera/types";

export type * from "#engine/game/camera/types";

export class Camera extends Disposable {
  static readonly DEFAULT_SMOOTHNESS = 0.3;

  static readonly DEFAULT_DEAD_ZONE: CameraDeadZone = {
    left: 25,
    right: 25,
    top: 25,
    bottom: 25,
  };

  game!: Game;

  readonly options: Required<CameraOptions>;

  x = 0;
  y = 0;

  get target(): PhysicsObject | null {
    return this.#target;
  }

  #target: PhysicsObject | null = null;
  #mounted = false;

  constructor(options: CameraOptions = {}) {
    super();

    this.options = {
      smoothness: options.smoothness ?? Camera.DEFAULT_SMOOTHNESS,
      deadZone: { ...Camera.DEFAULT_DEAD_ZONE, ...options.deadZone },
      limit: options.limit ?? {},
    };

    const { left, right, top, bottom } = this.options.deadZone;

    const invalidDeadZone = ![left, right, top, bottom].every((value) =>
      isInRange(value, 0, 100)) || left + right > 100 || top + bottom > 100;

    if (invalidDeadZone) {
      throw new RangeError(`${this.constructor.name}: deadZone percentages must be between 0 and 100, with opposing sides totaling at most 100`);
    }
  }

  mount(game: Game) {
    if (this.#mounted) {
      throw new Error(`${this.constructor.name}.mount: already mounted`);
    }

    this.#mounted = true;
    this.game = game;

    const { canvas } = game;

    this.onDestroy(
      canvas.emitter.on(canvas.events.background, () => {
        this.update();
      })
    );
  }

  bindTo(target: PhysicsObject): Destructor {
    this.#target = target;

    return () => {
      this.#target = null;
    };
  }

  update() {
    if (this.#target == null) {
      return;
    }

    const { canvas } = this.game;
    const target = this.#target;

    const targetX = target.x + target.width / 2;
    const targetY = target.y + target.height / 2;

    const { deadZone, smoothness, limit } = this.options;
    const left = canvas.width * deadZone.left / 100;
    const right = canvas.width * deadZone.right / 100;
    const top = canvas.height * deadZone.top / 100;
    const bottom = canvas.height * deadZone.bottom / 100;

    const leftDeadZone = this.x + left;
    const rightDeadZone = this.x + canvas.width - right;
    const topDeadZone = this.y + canvas.height - top;
    const bottomDeadZone = this.y + bottom;

    let newX = this.x;
    let newY = this.y;

    if (targetX < leftDeadZone) {
      newX = targetX - left;

    } else if (targetX > rightDeadZone) {
      newX = targetX - (canvas.width - right);
    }

    if (targetY > topDeadZone) {
      newY = targetY - (canvas.height - top);

    } else if (targetY < bottomDeadZone) {
      newY = targetY - bottom;
    }

    const x = this.x + (newX - this.x) * smoothness;
    const y = this.y + (newY - this.y) * smoothness;

    this.x = limit.x == null ? x : Math.max(limit.x, x);
    this.y = limit.y == null ? y : Math.max(limit.y, y);
  }
}
