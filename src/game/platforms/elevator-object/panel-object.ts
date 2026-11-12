import type { LoadedAnimation } from "#engine/animation";

import { InteractObject, ifAlive } from "#engine/game-objects";
import type { GameObject, GameObjectOptions } from "#engine/game-objects";

import { PersonObject } from "#game/person-object";
import type { ElevatorObject } from "#game/platforms/elevator-object";

export type ElevatorPanelOptions = GameObjectOptions<{
  show: LoadedAnimation;
  showActive: LoadedAnimation;
}>;

export class ElevatorPanelObject extends InteractObject<ElevatorPanelOptions> {
  declare acceptor: ElevatorObject | null;

  override init() {
    super.init();
    this.initPhysics();

    this.render.on(this.canvas.events.scene, () => {
      this.ensurePlaying(this.acceptor?.isMoving ? this.options.showActive : this.options.show);
    });
  }

  @ifAlive
  override visit(go: GameObject) {
    if (!(go instanceof PersonObject)) {
      return;
    }

    if (!go.consumeUse()) {
      return;
    }

    this.acceptor?.nextStop();
  }
}
