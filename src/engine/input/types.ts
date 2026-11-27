export type GamepadBinding =
  | { button: number }
  | { axis: number; direction: -1 | 1; threshold?: number };

export interface GamepadDevice {
  index: number;
  id: string;
}

export interface InputBindings<Action extends string> {
  keyboard: ReadonlyMap<string, Action>;
  gamepad: ReadonlyMap<GamepadBinding, Action>;
}

export interface InputOptions {
  active?: () => boolean;
}

export interface KeyChange<Key> {
  key: Key;
  pressed: boolean;
}

export interface KeyboardChange extends KeyChange<string> {
  event: KeyboardEvent;
}

export interface TouchChange extends KeyChange<string> {
  pointerId: number;
}
