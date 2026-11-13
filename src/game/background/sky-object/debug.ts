import { GameObjectDebug } from "#engine/game-objects/game-object/debug";
import type { ObjectRenderPayload } from "#engine/game-objects/game-object/render";

import type { SkyObject } from "#game/background/sky-object";

export class SkyObjectDebug extends GameObjectDebug<SkyObject> {
  protected override readonly boundsColor = "#8D7CFF";

  override draw(payload: ObjectRenderPayload) {
    const { width, height } = this.go.canvas;
    super.draw(payload, { left: 0, top: 0, right: width, bottom: height });

    const moon = this.go.render.getMoonBounds();

    if (moon != null) {
      this.drawPart(payload, { bounds: moon, name: "moon", color: "#FFE18C" });
    }

    for (const { bounds, index } of this.go.render.getCloudBounds()) {
      this.drawPart(payload, { bounds, name: `cloud ${index + 1}`, color: "#90D7F0" });
    }

    const lightning = this.go.render.lightningBounds;

    if (lightning != null) {
      this.drawPart(payload, { bounds: lightning, name: "lightning", color: "#B8E9FF" });
    }
  }
}
