import { cache } from "#decorators/cache";
import { GameObject, ifAlive } from "#engine/game-objects";
import type { WithEntry } from "#engine/game-objects";

import { PlatformObject } from "#game/platforms/platform-object";
import { ElevatorObjectRender } from "#game/platforms/elevator-object/render";
import type { ElevatorOptions } from "#game/platforms/elevator-object/types";

export { ElevatorPanelObject, type ElevatorPanelOptions } from "#game/platforms/elevator-object/panel-object";
export { industrialElevator } from "#game/platforms/elevator-object/presets";

export type * from "#game/platforms/elevator-object/types";

export class ElevatorObject extends PlatformObject<ElevatorOptions> {
  static override readonly with = GameObject.refs<ElevatorOptions>()({
    panel: ({ show, panel, effects }) => {
      const [Panel, options] = panel;
      const scale = effects?.scale ?? 1;

      return [Panel, {
        ...options,
        x: (options.x ?? 0) * scale,
        y: (options.y ?? show.maxHeight) * scale
      }];
    }
  });

  get targetStop() {
    return this.#targetStop;
  }

  get isMoving() {
    return this.x !== this.prevX || this.y !== this.prevY;
  }

  #originX = 0;
  #originY = 0;
  #targetStop = 0;

  @cache
  override get render(): ElevatorObjectRender {
    return new ElevatorObjectRender(this);
  }

  override init() {
    const { stops, speed } = this.options;

    const startsAtOrigin = stops[0]?.[0] === 0 && stops[0]?.[1] === 0;

    const validStops = stops.length >= 2 && startsAtOrigin &&
      stops.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y));

    const validSpeed = Number.isFinite(speed) && speed > 0;

    if (!validStops || !validSpeed) {
      throw new RangeError(`${this.name}.init: invalid elevator route`);
    }

    this.#originX = this.x;
    this.#originY = this.y;
    this.#targetStop = 0;

    this.render.mountCabin(this.options.cabin);
  }

  @ifAlive
  goToStop(index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= this.options.stops.length) {
      throw new RangeError(`${this.name}.goToStop: unknown stop ${index}`);
    }

    this.#targetStop = index;
    const [offsetX, offsetY] = this.options.stops[index]!;

    this.movement.follow({
      path: [[this.#originX + offsetX, this.#originY + offsetY]],
      speed: this.options.speed
    });
  }

  @ifAlive
  nextStop() {
    this.goToStop((this.#targetStop + 1) % this.options.stops.length);
  }

  protected override bindFlush() {
    super.bindFlush();

    const bounds = this.render.ceilingBounds;

    if (bounds == null) {
      return;
    }

    this.world.dynamics.insert(...this.poolPointer, ...bounds);
  }

  protected override createRefOptions(childOptions?: WithEntry[1]) {
    const { movement: _movement, ...options } = this.options;
    return { ...options, x: 0, y: 0, ...childOptions, acceptor: this };
  }
}
