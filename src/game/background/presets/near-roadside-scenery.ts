import { foldDeps } from "#/utils/fold-deps";

const _ = await foldDeps({
  resistanceWallBarrel: import("#/sprites/backgrounds/midground/resistance-wall-barrel"),
  propagandaTerminal: import("#/sprites/backgrounds/midground/propaganda-terminal"),
  abandonedGarages: import("#/sprites/backgrounds/midground/abandoned-garages"),
  agentBillboard: import("#/sprites/backgrounds/midground/agent-billboard"),
  thinkingBillboard: import("#/sprites/backgrounds/midground/thinking-billboard")
});

export const nearRoadsideScenery = [
  _.resistanceWallBarrel,
  _.propagandaTerminal,
  _.abandonedGarages,
  _.agentBillboard,
  _.thinkingBillboard
] as const;
