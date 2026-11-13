import type { Collision, CollisionScore, Game, RenderPayload } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";

import { ifAlive, ifDead, ifSleeping } from "#engine/game-objects/decorators";
import { GameObject } from "#engine/game-objects/game-object";
import type { GameObjectOptions } from "#engine/game-objects/game-object";

import { PhysicsObjectMotion } from "#engine/game-objects/physics-object/motion";

export { PhysicsObjectMotion } from "#engine/game-objects/physics-object/motion";

export enum CollisionStatus {
  NoCollision     = 0b00000,
  LeftCollision   = 0b00001,
  RightCollision  = 0b00010,
  TopCollision    = 0b00100,
  BottomCollision = 0b01000,
  Crashed         = 0b10000,
}

const ridingTolerance: Record<number, number> = {};

export abstract class PhysicsObject<T extends GameObjectOptions = GameObjectOptions> extends GameObject<T> {
  static readonly stats = {
    vx: 0,
    vy: 0,
    gravity: -1800,
    onGround: false,
  };

  get stats() {
    return this.#stats;
  }

  readonly motion = new PhysicsObjectMotion(this);

  override get redrawEvent() {
    return this.canvas.events.main;
  }

  #stats = PhysicsObject.stats;
  #riding: GameObject | null = null;

  // Опора может быть отдельной частью объекта, например крышей лифта
  #ridingLeft = 0;
  #ridingRight = 0;
  #ridingTop = 0;

  readonly #MAX_RIDING_TOLERANCE = 10;
  readonly #INITIAL_RIDING_TOLERANCE = 5;
  readonly #COLLISION_EPSILON = 0.001;

  override destroy() {
    if (this.destroyed) {
      return;
    }

    this.#riding = null;
    this.motion.reset();

    super.destroy();
  }

  @ifDead
  override create(game: Game, poolPointer: PoolPointer, opts?: T): T {
    this.#stats = { ...(this.constructor as typeof PhysicsObject).stats };
    this.motion.reset();
    return super.create(game, poolPointer, opts);
  }

  @ifAlive
  @ifSleeping(0)
  override move(dx: number, dy: number): number {
    const status = this.motion.kinematic ?
      this.kinematicMove(dx, dy) :
      this.solidMove(dx, dy);

    this.onMove(status);
    return status;
  }

  updateStats(patch: (stats: typeof PhysicsObject.stats) => Partial<typeof PhysicsObject.stats>) {
    Object.assign(this.stats, patch(this.stats));
  }

  protected solidMove(dx: number, dy: number): number {
    this.prevX = this.x;
    this.prevY = this.y;

    if (this.status.paused) {
      return CollisionStatus.NoCollision;
    }

    let moveStatus = this.#updateRiding(dy);

    if (dy < 0 && moveStatus & CollisionStatus.BottomCollision) {
      dy = 0;
    }

    if (!this.#exitCollision()) {
      return CollisionStatus.Crashed;
    }

    if (dx !== 0) {
      const targetX = this.x + dx;
      const startY = this.y;

      const canStep = dy <= 0 && (this.stats.onGround || Boolean(moveStatus & CollisionStatus.BottomCollision));
      const newX = this.#moveX(dx, canStep);

      if (newX !== this.x) {
        this.x = newX;
      }

      if (this.y > startY) {
        moveStatus |= CollisionStatus.BottomCollision;
        dy = 0;
      }

      if (newX !== targetX) {
        moveStatus |= dx > 0 ? CollisionStatus.RightCollision : CollisionStatus.LeftCollision;
      }
    }

    if (dy !== 0) {
      const targetY = this.y + dy;
      const newY = this.#moveY(dy);

      if (newY !== this.y) {
        this.y = newY;
      }

      if (newY !== targetY) {
        moveStatus |= dy < 0 ? CollisionStatus.BottomCollision : CollisionStatus.TopCollision;
      }
    }

    return moveStatus;
  }

  protected initPhysics(
    initializer?: (payload: RenderPayload) => void,
    effect?: (moveStatus: number) => void
  ) {
    const { stats } = this;

    this.render.on(this.redrawEvent, (payload) => {
      initializer?.(payload);

      // Гравитация
      stats.vy = Math.max(stats.gravity, stats.vy + stats.gravity * payload.delta);

      const moveStatus = this.move(stats.vx * payload.delta, stats.vy * payload.delta);

      stats.onGround = (moveStatus & CollisionStatus.BottomCollision) !== 0;

      if (moveStatus & CollisionStatus.TopCollision) {
        stats.vy = 0;

      } else if (stats.onGround) {
        stats.vy = stats.gravity;
      }

      effect?.(moveStatus);
    });
  }

  protected hasCollision(x = this.x, y = this.y, width = this.width, height = this.height): boolean {
    return this.world.hasCollision(x, y, x + width, y + height, this);
  }

  protected findBestCollision(
    x: number,
    y: number,
    score: CollisionScore
  ): Collision | null {
    return this.world.findBestCollision(x, y, x + this.width, y + this.height, score, this);
  }

  protected findInteractCollisions(x = this.x, y = this.y): readonly Collision[] {
    return this.world.findInteractCollisions(x, y, x + this.width, y + this.height, this);
  }

  protected findCollisions(x = this.x, y = this.y, width = this.width, height = this.height): readonly Collision[] {
    return this.world.findCollisions(x, y, x + width, y + height, this);
  }

  #updateRiding(dy: number) {
    // При движении вверх отрываемся от платформы, чтобы она не притягивала объект обратно
    if (dy > 0) {
      this.#riding = null;
      this.render.setVisualOffsetY(0);
      return CollisionStatus.NoCollision;
    }

    const { fps } = this.canvas;

    // Для разных FPS стартовое значение погрешности будет отличаться.
    // Например, при 60 FPS платформа будет двигаться куда большими шагами, нежели при 144 FPS.
    const RIDING_TOLERANCE = ridingTolerance[fps] ?? Math.min(
      this.#INITIAL_RIDING_TOLERANCE * (144 / fps),
      this.#MAX_RIDING_TOLERANCE
    );

    ridingTolerance[fps] = RIDING_TOLERANCE;

    // Платформа, на которой стоял игрок в прошлый раз
    const lastRiding = this.#riding;

    const lastShiftX = lastRiding == null ? 0 : this.#shift(lastRiding.x, lastRiding.prevX);
    const lastShiftY = lastRiding == null ? 0 : this.#shift(lastRiding.y, lastRiding.prevY);

    // Из-за динамической природы платформ и ошибок округления, нужно закладывать некоторую погрешность.
    // В базовом случае берется просто примерное подходящее число, а в дальнейшем учитываем скорость платформы.
    const ridingYTolerance = lastRiding != null ?
      Math.max(1, Math.ceil(Math.abs(lastShiftY))) :
      RIDING_TOLERANCE;

    const ridingXTolerance = lastRiding != null ?
      Math.ceil(Math.abs(lastShiftX)) :
      RIDING_TOLERANCE;

    const predictedTop = this.#ridingTop + lastShiftY;

    // Выбираем поверхность у ног, сохраняя прежнюю опору при близких результатах
    const collision = this.findBestCollision(this.x, this.y - ridingYTolerance, (bbox, object) => {
      const top = bbox[3];
      const distance = Math.abs(this.y - top);
      const overlap = Math.min(this.x + this.width, bbox[2]) - Math.max(this.x, bbox[0]);

      // Неподвижная поверхность не может подхватить объект снизу из-за погрешности поиска
      if (object.x === object.prevX && object.y === object.prevY && this.y < top - 1) {
        return Infinity;
      }

      if (distance > ridingYTolerance || overlap <= ridingXTolerance) {
        return Infinity;
      }

      const sameSurface = object === lastRiding && Math.abs(top - predictedTop) <= 1;

      // Небольшой приоритет прежней опоры, чтобы не переключаться между близкими поверхностями
      return distance - (sameSurface ? 0.25 : 0);
    });

    const riding = collision != null ? collision.object : lastRiding;

    const shiftX = riding == null ? 0 :
      riding === lastRiding ? lastShiftX : this.#shift(riding.x, riding.prevX);

    const shiftY = riding == null ? 0 :
      riding === lastRiding ? lastShiftY : this.#shift(riding.y, riding.prevY);

    const left = collision?.bbox[0] ?? this.#ridingLeft + shiftX;
    const right = collision?.bbox[2] ?? this.#ridingRight + shiftX;
    const top = collision?.bbox[3] ?? this.#ridingTop + shiftY;

    // Проверяем, что мы все еще стоим на платформе
    const distanceToPlatform = riding == null ? Infinity : this.y - top;
    const isStandingOnPlatform = riding == null || riding.destroyed ?
      false :
      Math.abs(distanceToPlatform) <= ridingYTolerance &&
      this.x + this.width - left > ridingXTolerance &&
      right - this.x > ridingXTolerance;

    let status: number = CollisionStatus.NoCollision;

    if (riding != null && isStandingOnPlatform) {
      this.#riding = riding;
      this.#ridingLeft = left;
      this.#ridingRight = right;
      this.#ridingTop = top;

      // Корректирую позицию объекта под позицию платформы на которой он стоит
      this.x += shiftX;

      // Ставим объект чуть-чуть выше, чтобы не провоцировать расчеты коллизий
      this.y = top + this.#COLLISION_EPSILON;

      // Из‑за потери точности при работе с дробными числами иногда возникает
      // эффект "парения в воздухе" при движении на быстрой платформе.
      // Это значение используется для визуальной фиксации спрайта, но не вызывает коллизий.
      this.render.setVisualOffsetY(shiftY);

      riding.visit(this);
      status |= CollisionStatus.BottomCollision;

    } else {
      this.#riding = null;
      this.render.setVisualOffsetY(0);
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

  #moveX(delta: number, canStep: boolean): number {
    const target = this.x + delta;

    const left = Math.min(this.x, target);
    const right = Math.max(this.x, target) + this.width;

    if (!this.hasCollision(left, this.y, right - left, this.height)) {
      return target;
    }

    const collisions = this.findCollisions(left, this.y, right - left, this.height);
    let resolved = target;

    for (const { bbox } of collisions) {
      resolved = delta > 0 ?
        Math.min(resolved, bbox[0] - this.width) :
        Math.max(resolved, bbox[2]);
    }

    if (resolved !== target && canStep && this.#stepUp(left, right, resolved, delta > 0, collisions)) {
      return target;
    }

    if (resolved !== target) {
      for (const { bbox, object } of collisions) {
        const edge = delta > 0 ? bbox[0] - this.width : bbox[2];

        if (edge === resolved) {
          object.visit(this);
        }
      }
    }

    return resolved;
  }

  #stepUp(left: number, right: number, stopX: number, movingRight: boolean, collisions: readonly Collision[]): boolean {
    let surfaceY = this.y;
    let support: GameObject | null = null;

    for (const { bbox, object } of collisions) {
      const edge = movingRight ? bbox[0] - this.width : bbox[2];

      if (edge !== stopX) {
        continue;
      }

      const height = bbox[3] - this.y;

      if (height <= 0 || !Number.isFinite(height) || object.allows(this, "stepUp", height) !== true) {
        return false;
      }

      if (bbox[3] > surfaceY) {
        surfaceY = bbox[3];
        support = object;
      }
    }

    if (support == null) {
      return false;
    }

    const raisedY = surfaceY + this.#COLLISION_EPSILON;

    if (this.hasCollision(this.x, this.y, this.width, raisedY - this.y + this.height) ||
      this.hasCollision(left, raisedY, right - left, this.height)) {
      return false;
    }

    this.y = raisedY;
    support.visit(this);
    return true;
  }

  #moveY(delta: number): number {
    const target = this.y + delta;

    const bottom = Math.min(this.y, target);
    const top = Math.max(this.y, target) + this.height;

    if (!this.hasCollision(this.x, bottom, this.width, top - bottom)) {
      return target;
    }

    const collisions = this.findCollisions(this.x, bottom, this.width, top - bottom);
    let resolved = target;

    for (const { bbox } of collisions) {
      resolved = delta > 0 ?
        Math.min(resolved, bbox[1] - this.height) :
        Math.max(resolved, bbox[3]);
    }

    if (resolved !== target) {
      for (const { bbox, object } of collisions) {
        const edge = delta > 0 ? bbox[1] - this.height : bbox[3];

        if (edge === resolved) {
          object.visit(this);
        }
      }
    }

    return resolved;
  }

  #shift(current: number, previous: number): number {
    return current === previous ? 0 : current - previous;
  }
}
