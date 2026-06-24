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

    let status: number = CollisionStatus.NoCollision;

    const riding = this.#riding;
    const ridingTolerance = riding != null ? Math.ceil(Math.abs(riding.y - riding.prevY)) : 3;

    // Проверяем, не стоит мы на двигающейся платформе
    const collision = this.findDynamicCollision(this.x, this.y - ridingTolerance);

    if (collision != null) {
      const riding = collision.object;
      this.#riding = collision.object;

      // Корректирую позицию объекта под позицию платформы на которой он стоит
      this.x += riding.x - riding.prevX;
      this.y = riding.y + riding.height;

      status |= CollisionStatus.BottomCollision;
      if (dy < 0) { dy = 0; }

    } else if (riding != null) {
      const isStandingOnPlatform =
        this.y - riding.y - riding.height <= ridingTolerance &&
        this.x > riding.x &&
        this.x < riding.x + riding.width;

      if (isStandingOnPlatform) {
        this.x += riding.x - riding.prevX;
        this.y = riding.y + riding.height;

        status |= CollisionStatus.BottomCollision;
        if (dy < 0) { dy = 0; }

      } else {
        this.#riding = null;
      }
    }

    if (!this.#exitCollision()) {
      return CollisionStatus.Crashed;
    }

    if (dx !== 0) {
      const newX = this.x + dx;

      if (!this.hasCollision(newX, this.y)) {
        this.x = newX;

      // Ищем максимальный шаг без коллизии
      } else {
        const step = dx > 0 ? 1 : -1;

        let testX = this.x;

        // Двигаем до упора
        while (Math.abs(testX - this.x) < Math.abs(dx)) {
          const nextX = testX + step;

          if (!this.hasCollision(nextX, this.y)) {
            testX = nextX;

          } else {
            break;
          }
        }

        this.x = testX;
      }

      if (this.x === this.prevX) {
        status |= dx > 0 ? CollisionStatus.RightCollision : CollisionStatus.LeftCollision;
      }
    }

    if (dy !== 0) {
      const newY = this.y + dy;

      if (!this.hasCollision(this.x, newY)) {
        this.y = newY;

      // Ищем максимальный шаг без коллизии
      } else {
        const step = dy > 0 ? 1 : -1;
        let testY = this.y;

        while (Math.abs(testY - this.y) < Math.abs(dy)) {
          const nextY = testY + step;

          if (!this.hasCollision(this.x, nextY)) {
            testY = nextY;

          } else {
            break;
          }
        }

        this.y = testY;
      }

      if (this.y === this.prevY) {
        status |= dy < 0 ? CollisionStatus.BottomCollision : CollisionStatus.TopCollision;
      }
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
}
