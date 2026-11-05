import { cityTowerA } from "#/sprites/backgrounds/buildings/towers/city-tower-a";
import { cityTowerB } from "#/sprites/backgrounds/buildings/towers/city-tower-b";
import { cityWatchtower } from "#/sprites/backgrounds/buildings/towers/city-watchtower";
import { cityAiDataCitadel } from "#/sprites/backgrounds/buildings/towers/city-ai-data-citadel";

import { cityRuinedResidence } from "#/sprites/backgrounds/buildings/ruins/city-ruined-residence";
import { cityRuinedHospital } from "#/sprites/backgrounds/buildings/ruins/city-ruined-hospital";
import { cityRuinedObservatory } from "#/sprites/backgrounds/buildings/ruins/city-ruined-observatory";

import { cityComplianceCenter } from "#/sprites/backgrounds/buildings/civic/city-compliance-center";
import { cityAutomatedDepot } from "#/sprites/backgrounds/buildings/industrial/city-automated-depot";

export const citySkyline = [
  cityTowerA,
  cityTowerB,
  cityWatchtower,
  cityAiDataCitadel,
  cityRuinedResidence,
  cityRuinedHospital,
  cityRuinedObservatory,
  cityComplianceCenter,
  cityAutomatedDepot
] as const;
