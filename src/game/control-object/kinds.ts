import { accessButton } from "#/sprites/interactables/button-access";
import { emergencyButton } from "#/sprites/interactables/button-emergency";
import { floorLever } from "#/sprites/interactables/lever-floor";
import { wallLever } from "#/sprites/interactables/lever-wall";
import { aiTerminal } from "#/sprites/interactables/terminal-ai";
import { resistanceTerminal } from "#/sprites/interactables/terminal-resistance";

export const controlKinds = {
  floorLever: {
    show: floorLever.idle,
    showActivate: floorLever.activate,
    showDeactivate: floorLever.deactivate
  },
  wallLever: {
    show: wallLever.idle,
    showActivate: wallLever.activate,
    showDeactivate: wallLever.deactivate
  },
  emergencyButton: { show: emergencyButton.idle, showActivate: emergencyButton.press },
  accessButton: { show: accessButton.idle, showActivate: accessButton.press },
  aiTerminal: {
    show: aiTerminal.idle,
    showActivate: aiTerminal.activate,
    showDeactivate: aiTerminal.deactivate
  },
  resistanceTerminal: {
    show: resistanceTerminal.idle,
    showActivate: resistanceTerminal.activate,
    showDeactivate: resistanceTerminal.deactivate
  }
} as const;
