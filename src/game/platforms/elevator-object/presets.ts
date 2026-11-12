import { ElevatorPanelObject } from "#game/platforms/elevator-object/panel-object";

import { foldDeps } from "#/utils/fold-deps";

const _ = await foldDeps({
  cabin: import("#/sprites/platforms/elevator/cabin"),
  floor: import("#/sprites/platforms/elevator/floor"),
  panel: import("#/sprites/platforms/elevator/panel")
});

export const industrialElevator = {
  show: _.elevatorFloor,
  cabin: { ..._.cabinSprites, height: 244 },
  panel: [ElevatorPanelObject, { show: _.panelSprites.idle, showActive: _.panelSprites.active, x: 45 }]
} as const;
