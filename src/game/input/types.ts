export const gameActions = ["left", "right", "jump", "jetpack", "use", "pause"] as const;

export type GameAction = (typeof gameActions)[number];
