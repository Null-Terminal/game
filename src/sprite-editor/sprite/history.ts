import type { SpriteDescriptor } from "#/sprite-buffer";

import { State } from "#sprite-editor/state";
import type { Sprite } from "#sprite-editor/sprite";

export class SpriteHistory extends State<Sprite, SpriteDescriptor> {
  constructor(sprite: Sprite) {
    super(sprite);
  }

  saveState() {
    const sprite = this.parent;

    this.pushState({
      x: sprite.x,
      y: sprite.y,
      width: sprite.width,
      height: sprite.height,
      spriteId: sprite.spriteId,
      animationDelay: sprite.animationDelay,
    });
  }

  protected restoreFromState(state: SpriteDescriptor | undefined) {
    if (state == null) {
      return;
    }

    const sprite = this.parent;

    sprite.x = state.x;
    sprite.y = state.y;
    sprite.width = state.width;
    sprite.height = state.height;
    sprite.spriteId = state.spriteId;
    sprite.animationDelay = state.animationDelay;
  }
}
