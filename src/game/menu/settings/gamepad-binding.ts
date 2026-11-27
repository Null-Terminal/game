import { GamepadInput, type GamepadBinding } from "#engine/input";

export function getActiveGamepadBindings(gamepad: Gamepad): GamepadBinding[] {
  const bindings: GamepadBinding[] = [];

  for (let index = 0; index < gamepad.buttons.length; index++) {
    if (GamepadInput.isButtonPressed(gamepad, index)) {
      bindings.push({ button: index });
    }
  }

  for (let index = 0; index < gamepad.axes.length; index++) {
    const value = gamepad.axes[index]!;

    if (Math.abs(value) >= 0.6) {
      bindings.push({ axis: index, direction: value < 0 ? -1 : 1 });
    }
  }

  return bindings;
}

export function getBindingKey(binding: GamepadBinding): string {
  return "button" in binding ? `button:${binding.button}` : `axis:${binding.axis}:${binding.direction}`;
}

export function areBindingsEqual(first: GamepadBinding, second: GamepadBinding): boolean {
  if ("button" in first && "button" in second) {
    return first.button === second.button;
  }

  return "axis" in first && "axis" in second &&
    first.axis === second.axis && first.direction === second.direction;
}

export function formatGamepadBinding(binding: GamepadBinding): string {
  if ("button" in binding) {
    return `Кнопка ${binding.button}`;
  }

  return `Ось ${binding.axis} ${binding.direction < 0 ? "−" : "+"}`;
}
