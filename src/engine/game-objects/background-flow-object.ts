import { cache } from "#decorators/cache";
import type { LoadedAnimation } from "#engine/animation-loader";

import { ifAlive } from "#engine/game-objects/decorators";
import { BackgroundObject } from "#engine/game-objects/background-object";
import { AnimationPlayback } from "#engine/game-objects/game-object/animation-playback";
import type * as go from "#engine/game-objects/game-object";

import { FlowLayout } from "#engine/game-objects/background-flow-object/layout";
import { BackgroundFlowObjectRender } from "#engine/game-objects/background-flow-object/render";

import type { BackgroundFlowRenderState, DefaultBackgroundFlowObjectOptions } from "#engine/game-objects/background-flow-object/types";

export type * from "#engine/game-objects/background-flow-object/types";

export class BackgroundFlowObject extends BackgroundObject<go.GameObjectOptions<DefaultBackgroundFlowObjectOptions>> {
  static override readonly animations = {
    flow: (object: go.GameObject) => {
      if (!(object instanceof BackgroundFlowObject)) {
        throw new TypeError("Flow animation requires a BackgroundFlowObject");
      }

      return object.#createCompositionPlayback();
    }
  };

  override readonly animations = BackgroundFlowObject.animations;

  @cache
  override get render(): BackgroundFlowObjectRender {
    return new BackgroundFlowObjectRender(this);
  }

  #playingSprites: readonly LoadedAnimation[] | null = null;
  #seed = 0;

  init() {
    this.#seed = this.options.seed ?? Math.floor(Math.random() * 0x100000000);
    this.play(this.options.sprites);
  }

  override destroy() {
    if (this.destroyed) {
      return;
    }

    super.destroy();

    this.#playingSprites = null;
    this.#seed = 0;
  }

  @ifAlive
  override play(input: go.PlayableAnimation | readonly LoadedAnimation[]) {
    if (this.#isComposition(input)) {
      this.#playingSprites = input;
      super.play(this.animations.flow);
      return;
    }

    super.play(input);
    this.#playingSprites = null;
  }

  @ifAlive
  override ensurePlaying(input: go.PlayableAnimation | readonly LoadedAnimation[]) {
    if (this.#isComposition(input)) {
      if (this.#playingSprites !== input) {
        this.play(input);
      }

      return;
    }

    if (this.nowPlaying !== input) {
      this.play(input);
    }
  }

  protected override shouldAutoStretchInfiniteBounds(): boolean {
    return false;
  }

  #isComposition(input: go.PlayableAnimation | readonly LoadedAnimation[]): input is readonly LoadedAnimation[] {
    return Array.isArray(input);
  }

  #createCompositionPlayback(): go.AnimationInstance {
    const sprites = this.#playingSprites ?? this.options.sprites;

    if (sprites.length === 0) {
      throw new Error("Background flow must contain at least one sprite");
    }

    const playbacks: AnimationPlayback[] = [];

    const sizes: number[] = [];
    const direction = this.options.direction ?? "horizontal";

    let maxWidth = 0;
    let maxHeight = 0;

    for (const sprite of sprites) {
      const playback = new AnimationPlayback(sprite);

      const width = sprite.maxWidth * this.effects.scale;
      const height = sprite.maxHeight * this.effects.scale;

      if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
        throw new RangeError("Background flow sprite dimensions must be positive finite numbers");
      }

      playbacks.push(playback);
      const size = direction === "horizontal" ? width : height;
      sizes.push(size);

      maxWidth = Math.max(maxWidth, width);
      maxHeight = Math.max(maxHeight, height);
    }

    const layout = new FlowLayout(sizes, {
      order: this.options.order ?? "shuffle",
      gap: this.options.gap ?? -1,
      seed: this.#seed
    });

    const state: BackgroundFlowRenderState = {
      layout,
      playbacks,
      direction,
      maxSize: direction === "horizontal" ? maxWidth : maxHeight
    };

    if (this.bbox == null) {
      this.width = maxWidth;
      this.height = maxHeight;
    }

    return {
      draw: (frame) => this.render.drawComposition(frame, state),

      advance: (elapsed) => {
        for (const playback of state.playbacks) {
          playback.advance(elapsed);
        }
      },

      destroy: () => {
        state.playbacks.length = 0;
      }
    };
  }
}
