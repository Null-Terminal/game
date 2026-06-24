import { StaticalObject } from "#engine/game-object";

export class InvisibleWallObject extends StaticalObject {
  static override animations = { };
  declare readonly Animations: (typeof InvisibleWallObject)["animations"];
  init() {}
}
