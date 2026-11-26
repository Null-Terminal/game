import { GameSettings } from "#engine/game";
import { defaultDistanceScreens, defaultProjectSettings } from "#game/settings/defaults";

import type { GameStorage } from "#engine/storage";

export function loadProjectSettings(storage: GameStorage) {
  return GameSettings.load({
    ...defaultProjectSettings,
    sleep: { distanceScreens: defaultDistanceScreens.sleep },
    arenaUnload: { distanceScreens: defaultDistanceScreens.arenaUnload }
  }, storage);
}
