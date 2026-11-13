import { BackgroundObjectDebug } from "#engine/game-objects/background-object/debug";

import type { BackgroundFlowObject } from "#engine/game-objects/background-flow-object";
import type { ObjectRenderPayload } from "#engine/game-objects/game-object";

export class BackgroundFlowObjectDebug extends BackgroundObjectDebug<BackgroundFlowObject> {
  protected override readonly boundsColor = "#FF4D8D";

  override draw(payload: ObjectRenderPayload) {
    if (this.go.nowPlaying !== this.go.animations.flow) {
      super.draw(payload);
    }
  }
}
