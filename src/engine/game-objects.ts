export { ifAlive, ifDead, ifSleeping } from "#engine/game-objects/decorators";

export { GameObject, GameObjectDebug, GameObjectRender, GameObjectSound } from "#engine/game-objects/game-object";
export type * from "#engine/game-objects/game-object";

export { GameObjectState } from "#engine/game-objects/game-object/state";
export type * from "#engine/game-objects/game-object/state";

export { ServantObject } from "#engine/game-objects/servant-object";

export { BackgroundObject } from "#engine/game-objects/background-object";
export type * from "#engine/game-objects/background-object";

export { BackgroundFlowObject } from "#engine/game-objects/background-flow-object";
export type * from "#engine/game-objects/background-flow-object";

export { ColliderObject, CollisionBody } from "#engine/game-objects/collider-object";
export { PhysicsObject, CollisionStatus, PhysicsObjectMotion } from "#engine/game-objects/physics-object";

export { InteractObject } from "#engine/game-objects/interact-object";
