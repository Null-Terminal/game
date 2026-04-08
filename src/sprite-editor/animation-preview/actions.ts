import { Handlers } from "#sprite-editor/handlers";

import type { AnimationPreview } from "#sprite-editor/animation-preview";

export class ActionHandlers extends Handlers<AnimationPreview> {
  constructor(parent: AnimationPreview) {
    super(parent);
  }

  destroy(): void {
    this.parent.controls.removeEventListener("click", this.onAction);
  }

  speedUp(): void {
    this.parent.speed *= 0.5;
  }

  speedReset(): void {
    this.parent.speed = 1;
  }

  speedDown(): void {
    this.parent.speed *= 1.5;
  }

  play() {
    this.parent.play();
  }

  pause() {
    this.parent.pause();
  }

  stop() {
    this.parent.stop();
  }

  nextSprite() {
    this.parent.pause();
    this.parent.renderSprite(++this.parent.spriteIndex);
  }

  reloadSprite() {
    this.parent.pause();
    this.parent.renderSprite(this.parent.spriteIndex);
  }

  previousSprite() {
    this.parent.pause();
    this.parent.renderSprite(--this.parent.spriteIndex);
  }

  protected initHandlers() {
    this.parent.controls.addEventListener("click", this.onAction);
  }
}
