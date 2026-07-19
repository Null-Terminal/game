import { Disposable } from "#engine/disposable";

import type { Game } from "#engine/game";
import type { MovableObject } from "#engine/game-objects";

export class Camera extends Disposable {
  readonly game: Game;

  readonly smoothness = 0.3;

  readonly deadZone = {
    left: 350,
    right: 350,
    top: 250,
    bottom: 250,
  };

  x = 0;
  y = 0;

  #target: MovableObject | null = null;

  constructor(game: Game) {
    super();

    this.game = game;

    const { canvas } = this.game;

    this.register(
      canvas.emitter.on(canvas.events.background, () => {
        this.update();
      })
    );
  }

  bindTo(target: MovableObject): () => void {
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

    const leftDeadZone = this.x + this.deadZone.left;
    const rightDeadZone = this.x + canvas.width - this.deadZone.right;
    const topDeadZone = this.y + canvas.height - this.deadZone.top;
    const bottomDeadZone = this.y + this.deadZone.bottom;

    let newX = this.x;
    let newY = this.y;

    if (targetX < leftDeadZone) {
      newX = targetX - this.deadZone.left;

    } else if (targetX > rightDeadZone) {
      newX = targetX - (canvas.width - this.deadZone.right);
    }

    if (targetY > topDeadZone) {
      newY = targetY - (canvas.height - this.deadZone.top);

    } else if (targetY < bottomDeadZone) {
      newY = targetY - this.deadZone.bottom;
    }

    this.x = Math.max(0, this.x + (newX - this.x) * this.smoothness);
    this.y = Math.max(0, this.y + (newY - this.y) * this.smoothness);
  }
}
