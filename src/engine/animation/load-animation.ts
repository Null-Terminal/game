import { AnimationDefinition, type Animation } from "#lib/animation-definition";

import { loadSound } from "#engine/audio";
import { isInRange } from "#/utils/validators";
import { LoadedAnimation } from "#engine/animation/loaded-animation";
import { loadSprite } from "#engine/animation/load-sprite";

import type { AnimationSounds, Import, LoadAnimationOptions } from "#engine/animation/types";

export async function loadAnimation<T extends Animation>(
  sprite: Import<string>,
  opts: LoadAnimationOptions<T>
): Promise<LoadedAnimation<AnimationSounds<T>>> {
  const [spriteUrl, animationOpts] = await Promise.all([resolve(sprite), resolve(opts.animation)]);

  const animation = new AnimationDefinition(animationOpts.default);

  const [image, sounds] = await Promise.all([
    loadSprite(spriteUrl.default, opts.sprite),

    Promise.all(Object.entries(animation.params.sounds ?? {})
      .map(async ([name, definition]) => {
        const volume = definition.volume ?? 1;

        if (!isInRange(volume, 0, 1)) {
          throw new RangeError(`Sound "${name}" volume must be between 0 and 1`);
        }

        return [name, {
          buffer: await loadSound(definition.url),
          loop: definition.loop ?? false,
          volume,
          category: definition.category ?? "effects"
        }];
      }))
  ]);

  return new LoadedAnimation<AnimationSounds<T>>(
    image,
    animation,
    Object.fromEntries(sounds) as LoadedAnimation<AnimationSounds<T>>["sounds"]
  );

  async function resolve<T>(value: Import<T>): Promise<{ default: T }> {
    const v = await value;

    if (v == null || typeof v != "object" || !("default" in v)) {
      return { default: v };
    }

    return v;
  }
}
