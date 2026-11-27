import type { WorldObjects } from "#engine/game";

import { createBackground } from "#game/world/background";
import { createStreet } from "#game/world/street";
import { createUpper } from "#game/world/upper";

export async function createDemoParts(showSeams = false) {
  const [background, street, upper] = await Promise.all([
    createBackground(showSeams),
    createStreet(),
    createUpper()
  ]);

  return { background, street, upper };
}

export async function createDemoWorld(showSeams = false): Promise<WorldObjects> {
  const { background, street, upper } = await createDemoParts(showSeams);
  return [...background, ...street, ...upper];
}
