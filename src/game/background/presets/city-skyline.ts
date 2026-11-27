import { foldDeps } from "#/utils/fold-deps";

const _ = await foldDeps({
  towersA: import("#game/sprites/backgrounds/buildings/towers/city-tower-a"),
  towersB: import("#game/sprites/backgrounds/buildings/towers/city-tower-b"),
  watchtower: import("#game/sprites/backgrounds/buildings/towers/city-watchtower"),
  citadel: import("#game/sprites/backgrounds/buildings/towers/city-ai-data-citadel"),

  residence: import("#game/sprites/backgrounds/buildings/ruins/city-ruined-residence"),
  hospital: import("#game/sprites/backgrounds/buildings/ruins/city-ruined-hospital"),
  observatory: import("#game/sprites/backgrounds/buildings/ruins/city-ruined-observatory"),

  complianceCenter: import("#game/sprites/backgrounds/buildings/civic/city-compliance-center"),
  depot: import("#game/sprites/backgrounds/buildings/industrial/city-automated-depot")
});

export const citySkyline = [
  _.cityTowerA,
  _.cityTowerB,
  _.cityWatchtower,
  _.cityAiDataCitadel,
  _.cityRuinedResidence,
  _.cityRuinedHospital,
  _.cityRuinedObservatory,
  _.cityComplianceCenter,
  _.cityAutomatedDepot
] as const;
