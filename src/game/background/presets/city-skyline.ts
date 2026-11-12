import { foldDeps } from "#/utils/fold-deps";

const _ = await foldDeps({
  towersA: import("#/sprites/backgrounds/buildings/towers/city-tower-a"),
  towersB: import("#/sprites/backgrounds/buildings/towers/city-tower-b"),
  watchtower: import("#/sprites/backgrounds/buildings/towers/city-watchtower"),
  citadel: import("#/sprites/backgrounds/buildings/towers/city-ai-data-citadel"),

  residence: import("#/sprites/backgrounds/buildings/ruins/city-ruined-residence"),
  hospital: import("#/sprites/backgrounds/buildings/ruins/city-ruined-hospital"),
  observatory: import("#/sprites/backgrounds/buildings/ruins/city-ruined-observatory"),

  complianceCenter: import("#/sprites/backgrounds/buildings/civic/city-compliance-center"),
  depot: import("#/sprites/backgrounds/buildings/industrial/city-automated-depot")
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
