import { ElevatorPanelObject } from "#game/platforms/elevator-object/panel-object";

import { cabinSprites } from "#/sprites/platforms/elevator/cabin";
import { elevatorFloor } from "#/sprites/platforms/elevator/floor";
import { panelSprites } from "#/sprites/platforms/elevator/panel";

export const industrialElevator = {
  show: elevatorFloor,
  cabin: { ...cabinSprites, height: 244 },
  panel: [ElevatorPanelObject, { show: panelSprites.idle, showActive: panelSprites.active, x: 45 }]
} as const;
