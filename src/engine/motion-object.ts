import { GameObject } from "#engine/game-object";

export * from "#engine/game-object/types";

export abstract class MotionObject extends GameObject {
  hasCollision(x = this.x, y = this.y): boolean {
    return this.world.hasCollision(x, y, x + this.width, y + this.height);
  }

  findCollisions(x = this.x, y = this.y): GameObject[] {
    return this.world.findCollisions(x, y, x + this.width, y + this.height);
  }

  move(dx: number, dy: number) {
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

          this.y = testY;
        }
      }
    }
  }
}
