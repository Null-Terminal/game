import { SpriteAnimation } from "#/sprite-animation";

import { loadSprite } from "#engine/animation-loader/sprite-loader";
import { LoadedAnimation } from "#engine/animation-loader/loaded-animation";

import type { LoadAnimationOptions, Import } from "#engine/animation-loader/types";

export type { LoadedAnimation };

export * from "#engine/animation-loader/types";

export async function loadAnimation(
  sprite: Import<string>,
  options: LoadAnimationOptions
): Promise<LoadedAnimation> {
  const [spriteUrl, animationOpts] = await Promise.all([resolve(sprite), resolve(options.animation)]);

  const image = await loadSprite(spriteUrl.default, options.sprite);
  const animation = new SpriteAnimation(animationOpts.default);

  return new LoadedAnimation(image, animation);

  async function resolve<T>(value: Import<T>): Promise<{ default: T }> {
    const v = await value;

    if (v == null || typeof v != "object" || !("default" in v)) {
      return { default: v };
    }

    return v;
  }
}
