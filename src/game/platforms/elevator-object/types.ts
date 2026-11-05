import type { LoadedAnimation } from "#engine/animation";
import type { KindedGameObjectCtor } from "#engine/game-object-pool";
import type { DynamicInteractObject } from "#engine/game-objects";
import type { DefaultGameObjectOptions, GameObjectOptions } from "#engine/game-objects";

export interface ElevatorCabin {
  // Задняя стенка за игроком
  rear?: LoadedAnimation;

  // Передняя рамка поверх игрока
  front?: LoadedAnimation;

  // Крыша за игроком с отдельной коллизией
  ceiling?: LoadedAnimation;

  // Высота потолка над полом; без стенок обязательна при наличии потолка
  height?: number;
}

export type ElevatorPanelEntry = readonly [
  object: KindedGameObjectCtor<typeof DynamicInteractObject>,
  // Координаты относительно кабины; y по умолчанию совпадает с поверхностью пола
  options: { x?: number; y?: number; [key: string]: unknown }
];

export interface ElevatorPreset {
  cabin: ElevatorCabin;
  panel: ElevatorPanelEntry;
}

export type ElevatorStop = readonly [offsetX: number, offsetY: number];

export type ElevatorOptions = GameObjectOptions<DefaultGameObjectOptions & ElevatorPreset & {
  // Несущая платформа с коллизией
  show: LoadedAnimation;

  // Остановки относительно начального положения кабины; первая — [0, 0]
  stops: readonly [ElevatorStop, ElevatorStop, ...ElevatorStop[]];
  speed: number;
}>;
