import { GameObjectDebug } from "#engine/game-objects/game-object/debug";

import type { WindDebrisObject } from "#game/background/wind-debris-object";

export class WindDebrisObjectDebug extends GameObjectDebug<WindDebrisObject> {
  protected override readonly boundsColor = "#FFD54A";
}
