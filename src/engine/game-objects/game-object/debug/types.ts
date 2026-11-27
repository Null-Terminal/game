import type { LoadedAnimation } from "#engine/animation";

export interface GameObjectDebugOptions {
  // Рамка объекта; строкой можно задать её цвет
  bounds?: boolean | string;

  // Подпись с типом, именем, анимацией и кадром
  label?: boolean;

  // Выводит сведения об объекте в консоль по клику
  inspect?: boolean;
}

export interface DebugBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface DebugPart {
  bounds: Readonly<DebugBounds>;
  animation?: LoadedAnimation;
  frame?: number;
  name?: string;
  color?: string;
}
