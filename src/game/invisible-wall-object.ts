import { StaticObject } from "#engine/game-object";

export class InvisibleWallObject extends StaticObject {
  static override animations = { };
  declare readonly Animations: (typeof InvisibleWallObject)["animations"];
  init() {}
}
