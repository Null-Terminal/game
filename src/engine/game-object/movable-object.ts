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

  hasCollision(x = this.x, y = this.y): boolean {
    return this.world.hasCollision(x, y, x + this.width, y + this.height);
  }

  findCollisions(x = this.x, y = this.y): Collision[] {
    return this.world.findCollisions(x, y, x + this.width, y + this.height);
  }

  override move(dx: number, dy: number): number {
    if (!this.#exitCollision()) {
      return CollisionStatus.Crashed;
    }

    const oldX = this.x;
    const oldY = this.y;

    let status: number = CollisionStatus.NoCollision;

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

      if (this.x === oldX) {
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

      if (this.y === oldY) {
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
