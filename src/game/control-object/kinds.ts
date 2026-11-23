import { foldDeps } from "#/utils/fold-deps";

const _ = await foldDeps({
  accessButton: import("#game/sprites/interactables/button-access"),
  emergencyButton: import("#game/sprites/interactables/button-emergency"),
  floorLever: import("#game/sprites/interactables/lever-floor"),
  wallLever: import("#game/sprites/interactables/lever-wall"),
  aiTerminal: import("#game/sprites/interactables/terminal-ai"),
  resistanceTerminal: import("#game/sprites/interactables/terminal-resistance")
});

export const controlKinds = {
  floorLever: {
    show: _.floorLever.idle,
    showActivate: _.floorLever.activate,
    showDeactivate: _.floorLever.deactivate
  },
  wallLever: {
    show: _.wallLever.idle,
    showActivate: _.wallLever.activate,
    showDeactivate: _.wallLever.deactivate
  },
  emergencyButton: { show: _.emergencyButton.idle, showActivate: _.emergencyButton.press },
  accessButton: { show: _.accessButton.idle, showActivate: _.accessButton.press },
  aiTerminal: {
    show: _.aiTerminal.idle,
    showActivate: _.aiTerminal.activate,
    showDeactivate: _.aiTerminal.deactivate
  },
  resistanceTerminal: {
    show: _.resistanceTerminal.idle,
    showActivate: _.resistanceTerminal.activate,
    showDeactivate: _.resistanceTerminal.deactivate
  }
} as const;
