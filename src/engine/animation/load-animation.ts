import { AnimationDefinition } from "#/animation-definition";

import { LoadedAnimation } from "#engine/animation/loaded-animation";
import { loadSprite } from "#engine/animation/load-sprite";

import type { Import, LoadAnimationOptions } from "#engine/animation/types";

export async function loadAnimation(
  sprite: Import<string>,
  opts: LoadAnimationOptions
): Promise<LoadedAnimation> {
  const [spriteUrl, animationOpts] = await Promise.all([resolve(sprite), resolve(opts.animation)]);

  const image = await loadSprite(spriteUrl.default, opts.sprite);
  const animation = new AnimationDefinition(animationOpts.default);

  return new LoadedAnimation(image, animation);

  async function resolve<T>(value: Import<T>): Promise<{ default: T }> {
    const v = await value;

    if (v == null || typeof v != "object" || !("default" in v)) {
      return { default: v };
    }

    return v;
  }
}
