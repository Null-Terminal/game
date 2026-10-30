export { ifAlive, ifDead, ifShadowed } from "#engine/game-objects/decorators";

export { GameObject } from "#engine/game-objects/game-object";
export { GameObjectServant } from "#engine/game-objects/servant";
export type * from "#engine/game-objects/game-object";

export { BackgroundObject } from "#engine/game-objects/background-object";
export type { BackgroundObjectDebugOptions } from "#engine/game-objects/background-object";

export { BackgroundFlowObject } from "#engine/game-objects/background-flow-object";
export type { BackgroundFlowDirection, BackgroundFlowGap, BackgroundFlowOrder, DefaultBackgroundFlowObjectOptions } from "#engine/game-objects/background-flow-object";

export { StaticObject } from "#engine/game-objects/static-object";
export { DynamicObject } from "#engine/game-objects/dynamic-object";
export { MovableObject, CollisionStatus, MovableObjectMotion } from "#engine/game-objects/movable-object";

export { StaticInteractObject } from "#engine/game-objects/static-interact-object";
export { DynamicInteractObject } from "#engine/game-objects/dynamic-interact-object";
