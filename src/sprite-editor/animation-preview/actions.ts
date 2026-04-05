import { RenderedSpriteBuffer } from "#sprite-buffer/rendered-sprite-buffer";

import { Handlers } from "#sprite-editor/handlers";
import type { Sprite } from "#sprite-editor/sprite";

import type { AnimationPreview } from "#sprite-editor/animation-preview";

export class ActionHandlers extends Handlers<AnimationPreview> {
  #animationId = 0;

  constructor(parent: AnimationPreview) {
    super(parent);
  }

  destroy(): void {
    this.parent.controls.removeEventListener("click", this.onAction);
  }

  speedUp(): void {
    this.parent.speed *= 0.5;
  }

  speedDown(): void {
    this.parent.speed *= 1.5;
  }

  play() {
    const { player } = this.parent;

    const { canvas, data } = RenderedSpriteBuffer.mergeSprites(
      Array.from(this.parent.grid.querySelectorAll("sprite-item")) as Sprite[]
    );

    player.width = canvas.width;
    player.height = canvas.height;

    const ctx = player.getContext("2d")!;
    ctx.fillStyle = "#1BBF68";

    let spriteIndex = 0;
    let lastFrameTime = 0;

    cancelAnimationFrame(this.#animationId);

    const animate = (now?: number) => {
      this.#animationId = requestAnimationFrame(animate);

      if (now == null) {
        return;
      }

      const sprite = data.at(spriteIndex)!;

      if (now - lastFrameTime >= sprite.animationDelay * this.parent.speed) {
        spriteIndex++;
        spriteIndex %= data.size;

        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(canvas, sprite.x, sprite.y, sprite.width, sprite.height, 0, canvas.height - sprite.height, sprite.width, sprite.height);

        lastFrameTime = now;
      }
    };

    animate();
  }

  protected initHandlers() {
    this.parent.controls.addEventListener("click", this.onAction);
  }
}
