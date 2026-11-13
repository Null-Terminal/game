import { GameObjectDebug } from "#engine/game-objects/game-object/debug";
import type { ObjectRenderPayload } from "#engine/game-objects/game-object/render";

import type { FogObject } from "#game/background/fog-object";

export class FogObjectDebug extends GameObjectDebug<FogObject> {
  override draw(payload: ObjectRenderPayload) {
    const bounds = this.go.render.visibleBounds;

    if (bounds != null) {
      super.draw(payload, bounds);
    }
  }
}
