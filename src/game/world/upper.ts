import type { WorldObjects } from "#engine/game";

import { foldDeps } from "#/utils/fold-deps";

const deps = {
  game: import("#engine/game"),
  objects: import("#engine/game-objects"),

  pickup: import("#game/pickup-object"),
  platform: import("#game/platforms/platform-object"),

  scaffoldFrame: import("#game/sprites/platforms/scaffold-frame"),
  scaffoldPlank: import("#game/sprites/platforms/scaffold-plank")
};

export async function createUpper(): Promise<WorldObjects> {
  const _ = await foldDeps(deps);
  const upper: WorldObjects = [];

  // Следующие ярусы принадлежат соседней арене и могут выгружаться отдельно
  for (let tier = 4; tier < 9; tier++) {
    const bottom = 225 + tier * 300;

    upper.push(..._.World.of([[_.BackgroundObject, {
      show: _.scaffoldFrame,
      stretch: "w",
      bbox: [2730, bottom, 2730 + 11 * _.scaffoldFrame.maxWidth, bottom + _.scaffoldFrame.maxHeight]
    }]]));
  }

  for (let tier = 4; tier < 9; tier++) {
    const y = 543 + tier * 300;

    for (let column = 0; column < 6; column++) {
      const x = 3020 + column * 250;
      upper.push([_.PlatformObject, { show: _.scaffoldPlank.intact, x, y }]);
    }
  }

  upper.push(..._.World.of([[_.PickupObject, { kind: "fuel", x: 3500, y: 2470 }]]));

  return upper;
}
