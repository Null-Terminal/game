import { Disposable } from "#engine/disposable";

import type { Game } from "#engine/game";
import type { MovableObject } from "#engine/game-objects";

import type { CameraDeadZone, CameraOptions } from "#engine/game/camera/types";

export * from "#engine/game/camera/types";

export class Camera extends Disposable {
  static readonly DEFAULT_SMOOTHNESS = 0.3;

  static readonly DEFAULT_DEAD_ZONE: CameraDeadZone = {
    left: 350,
    right: 350,
    top: 250,
    bottom: 250,
  };

  game!: Game;

  readonly options: Required<CameraOptions>;

  x = 0;
  y = 0;

  #target: MovableObject | null = null;
  #mounted = false;

  constructor(options: CameraOptions = {}) {
    super();

    this.options = {
      smoothness: options.smoothness ?? Camera.DEFAULT_SMOOTHNESS,
      deadZone: { ...Camera.DEFAULT_DEAD_ZONE, ...options.deadZone },
      limit: options.limit ?? {},
    };
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

  bindTo(target: MovableObject): Destructor {
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

    const leftDeadZone = this.x + deadZone.left;
    const rightDeadZone = this.x + canvas.width - deadZone.right;
    const topDeadZone = this.y + canvas.height - deadZone.top;
    const bottomDeadZone = this.y + deadZone.bottom;

    let newX = this.x;
    let newY = this.y;

    if (targetX < leftDeadZone) {
      newX = targetX - deadZone.left;

    } else if (targetX > rightDeadZone) {
      newX = targetX - (canvas.width - deadZone.right);
    }

    if (targetY > topDeadZone) {
      newY = targetY - (canvas.height - deadZone.top);

    } else if (targetY < bottomDeadZone) {
      newY = targetY - deadZone.bottom;
    }

    const x = this.x + (newX - this.x) * smoothness;
    const y = this.y + (newY - this.y) * smoothness;

    this.x = limit.x == null ? x : Math.max(limit.x, x);
    this.y = limit.y == null ? y : Math.max(limit.y, y);
  }
}
