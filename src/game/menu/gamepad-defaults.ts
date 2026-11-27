import type { GamepadBinding } from "#engine/input";
import type { MenuGamepadAction, ProjectSettings } from "#game/settings";

export const menuGamepadActions: MenuGamepadAction[] = ["confirm", "back", "previousGroup", "nextGroup"];

export const menuGamepadLabels: Record<MenuGamepadAction, string> = {
  confirm: "Выбрать",
  back: "Назад",
  previousGroup: "Предыдущий раздел",
  nextGroup: "Следующий раздел"
};

export function getDefaultMenuGamepadBindings(
  layout: ProjectSettings["gamepadLayout"],
  gamepad: Gamepad | null
): Record<MenuGamepadAction, GamepadBinding> {
  const rawPlayStation = layout === "playstation" && gamepad != null && gamepad.mapping !== "standard";

  return {
    confirm: { button: rawPlayStation ? 1 : 0 },
    back: { button: rawPlayStation ? 2 : 1 },
    previousGroup: { button: 4 },
    nextGroup: { button: 5 }
  };
}
