import { GameObjectRender } from "#engine/game-objects/game-object/render";

import type { AnimationLayer } from "#engine/animation";
import type { ElevatorObject } from "#game/platforms/elevator-object";
import type { ElevatorCabin } from "#game/platforms/elevator-object/types";

export class ElevatorObjectRender extends GameObjectRender<ElevatorObject> {
  #ceiling: AnimationLayer | null = null;

  get ceilingY() {
    const { cabin } = this.go.options;
    const height = cabin.height ?? Math.max(cabin.rear?.maxHeight ?? 0, cabin.front?.maxHeight ?? 0);
    return this.go.y + height * this.go.effects.scale;
  }

  get ceilingBounds() {
    const ceiling = this.#ceiling;

    if (ceiling == null) {
      return null;
    }

    const { go } = this;
    return ceiling.getCollisionBounds(go.x + go.width / 2, this.ceilingY);
  }

  mountCabin(cabin: ElevatorCabin) {
    const { go } = this;
    const { events } = go.canvas;

    if (cabin.ceiling != null && cabin.height == null && cabin.rear == null && cabin.front == null) {
      throw new TypeError("Elevator cabin needs height when ceiling has no walls");
    }

    const rear = cabin.rear == null ? null : this.sprite(cabin.rear, "center", "bottom");
    const front = cabin.front == null ? null : this.sprite(cabin.front, "center", "bottom");
    const ceiling = cabin.ceiling == null ? null : this.sprite(cabin.ceiling, "center", "center");
    this.#ceiling = ceiling;

    if (rear == null && front == null && ceiling == null) {
      return;
    }

    this.on(events.scene, ({ ctx }, elapsed) => {
      if (go.status.sleeping) {
        return;
      }

      rear?.advance(elapsed);
      front?.advance(elapsed);
      ceiling?.advance(elapsed);

      if (rear != null) {
        rear.draw(ctx, go.x + go.width / 2, go.y);
      }

      if (ceiling != null) {
        ceiling.draw(ctx, go.x + go.width / 2, this.ceilingY);
      }
    });

    this.on(events.overlay, ({ ctx }) => {
      if (go.status.sleeping) {
        return;
      }

      if (front != null) {
        front.draw(ctx, go.x + go.width / 2, go.y);
      }
    });
  }
}
