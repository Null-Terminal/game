import { GameObjectDebug } from "#engine/game-objects";

import type { WindDebrisObject } from "#game/background/wind-debris-object";

export class WindDebrisObjectDebug extends GameObjectDebug<WindDebrisObject> {
  protected override readonly boundsColor = "#FFD54A";
}
