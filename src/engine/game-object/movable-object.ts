import { GameObject } from "#engine/game-object/game-object";
import type { Collision } from "#engine/game/world";

export enum CollisionStatus {
  NoCollision     = 0b00000,
  LeftCollision   = 0b00001,
  RightCollision  = 0b00010,
  TopCollision    = 0b00100,
  BottomCollision = 0b01000,
  Crashed         = 0b10000,
}

export abstract class MovableObject extends GameObject {
  override get redrawEvent() {
    return this.canvas.events.main;
  }

  #riding: GameObject | null = null;
  #ridingTolerance: Record<number, number> = {};

  override destroy() {
    super.destroy();
    this.#riding = null;
  }

  hasCollision(x = this.x, y = this.y): boolean {
    return this.world.hasCollision(x, y, x + this.width, y + this.height);
  }

  findDynamicCollision(x = this.x, y = this.y): Collision | null {
    return this.world.findDynamicCollision(x, y, x + this.width, y + this.height);
  }

  findCollisions(x = this.x, y = this.y): Collision[] {
    return this.world.findCollisions(x, y, x + this.width, y + this.height);
  }

  override move(dx: number, dy: number): number {
    this.prevX = this.x;
    this.prevY = this.y;

    let status = this.#updateRiding();

    if (dy < 0 && status & CollisionStatus.BottomCollision) {
      dy = 0;
    }

    if (!this.#exitCollision()) {
      return CollisionStatus.Crashed;
    }

    if (dx !== 0) {
      const newX = this.#moveX(dx);

      if (newX !== this.x) {
        this.x = newX;

      } else {
        status |= dx > 0 ? CollisionStatus.RightCollision : CollisionStatus.LeftCollision;
      }
    }

    if (dy !== 0) {
      const newY = this.#moveY(dy);

      if (newY !== this.y) {
        this.y = newY;

      } else {
        status |= dy < 0 ? CollisionStatus.BottomCollision : CollisionStatus.TopCollision;
      }
    }

    return status;
  }

  #updateRiding() {
    const { fps } = this.canvas;

    // Для разных FPS стартовое значение погрешности будет отличаться.
    // Например, при 60 FPS платформа будет двигаться куда большими шагами, нежели при 144 FPS.
    const RIDING_TOLERANCE = this.#ridingTolerance[fps] ?? Math.min(5 * (144 / fps), 20);
    this.#ridingTolerance[fps] = RIDING_TOLERANCE;

    // Платформа, на которой стоял игрок в прошлый раз
    const lastRiding = this.#riding;

    // Из-за динамической природы платформ и ошибок округления, нужно закладывать некоторую погрешность.
    // В базовом случае берется просто примерное подходящее число, а в дальнейшем учитываем скорость платформы.
    const ridingYTolerance = lastRiding != null ?
      Math.ceil(Math.abs(lastRiding.y - lastRiding.prevY)) :
      RIDING_TOLERANCE;

    const ridingXTolerance = lastRiding != null ?
      Math.ceil(Math.abs(lastRiding.x - lastRiding.prevX)) :
      RIDING_TOLERANCE;

    // Проверяем, не стоим ли мы на двигающейся платформе
    const collision = this.findDynamicCollision(this.x, this.y - ridingYTolerance);
    const riding = collision != null ? collision.object : lastRiding;

    // Проверяем, что мы все еще стоим на платформе
    const isStandingOnPlatform = riding == null ?
      false :
      this.y - riding.y - riding.height <= ridingYTolerance &&
      this.x + this.width - riding.x > ridingXTolerance &&
      riding.x + riding.width - this.x > ridingXTolerance;

    let status: number = CollisionStatus.NoCollision;

    if (riding != null && isStandingOnPlatform) {
      this.#riding = riding;

      // Корректирую позицию объекта под позицию платформы на которой он стоит
      this.x += riding.x - riding.prevX;
      this.y = riding.y + riding.height;

      status |= CollisionStatus.BottomCollision;

    } else {
      this.#riding = null;
    }

    return status;
  }

  #exitCollision(): boolean {
    if (!this.hasCollision(this.x, this.y)) {
      return true;
    }

    const collisions = this.findCollisions(this.x, this.y);

    // Собираем все границы препятствий
    let nearestX = null;
    let nearestY = null;
    let minDistance = Infinity;

    for (const { bbox: [minX, minY, maxX, maxY] } of collisions) {
      // Вычисляем расстояния до каждой стороны
      const distToLeft = Math.abs(this.x - maxX);
      const distToRight = Math.abs((this.x + this.width) - minX);
      const distToTop = Math.abs(this.y - maxY);
      const distToBottom = Math.abs((this.y + this.height) - minY);

      // Находим ближайшую сторону
      const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

      if (minDist < minDistance) {
        minDistance = minDist;

        if (minDist === distToLeft) {
          nearestX = maxX;
          nearestY = this.y;

        } else if (minDist === distToRight) {
          nearestX = minX - this.width;
          nearestY = this.y;

        } else if (minDist === distToTop) {
          nearestX = this.x;
          nearestY = maxY;

        } else if (minDist === distToBottom) {
          nearestX = this.x;
          nearestY = minY - this.height;
        }
      }
    }

    if (nearestX != null || nearestY != null) {
      const x = nearestX ?? this.x;
      const y = nearestY ?? this.y;

      if (!this.hasCollision(x, y)) {
        this.x = x;
        this.y = y;
        return true;
      }
    }

    return false;
  }

  #moveX(delta: number): number {
    if (delta === 0) {
      return this.x;
    }

    const newX = this.x + delta;

    if (!this.hasCollision(newX, this.y)) {
      return newX;
    }

    const step = delta > 0 ? 1 : -1;

    let start = this.x;

    while (Math.abs(start - this.x) < Math.abs(delta)) {
      const next = start + step;

      if (!this.hasCollision(next, this.y)) {
        start = next;

      } else {
        break;
      }
    }

    return start;
  }

  #moveY(delta: number): number {
    if (delta === 0) {
      return this.y;
    }

    const newY = this.y + delta;

    if (!this.hasCollision(this.x, newY)) {
      return newY;
    }

    const step = delta > 0 ? 1 : -1;

    let start = this.y;

    while (Math.abs(start - this.y) < Math.abs(delta)) {
      const next = start + step;

      if (!this.hasCollision(this.x, next)) {
        start = next;

      } else {
        break;
      }
    }

    return start;
  }
}
