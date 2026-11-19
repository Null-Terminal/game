import type { StateValue } from "#engine/game-objects";
import type { World, WorldObjects } from "#engine/game/world";
import type { Arenas } from "#engine/game/arena/arenas";

export interface ArenaDefinition {
  objects: WorldObjects;

  // Автоматическая выгрузка при удалении всех объектов от камеры; по умолчанию включена
  autoUnload?: boolean;
}

export type ArenaSource = (signal: AbortSignal) => ArenaDefinition | Promise<ArenaDefinition>;

export interface ArenaRef<T extends ArenaSource = ArenaSource> {
  readonly name?: string;
  readonly source: T;
}

export type ArenaRefs<T extends Record<string, ArenaSource>> = {
  readonly [K in keyof T]: ArenaRef<T[K]>;
};

export interface ArenasDeclaration<T extends Record<string, ArenaSource> = Record<string, ArenaSource>> {
  readonly refs: ArenaRefs<T>;
  preload(...refs: ArenaRef[]): this;
  create(world: World): Arenas<T>;
}

export interface ArenasOptions {
  unload?: ArenaUnloadOptions;
}

export interface ArenaUnloadOptions {
  // Расстояние от камеры в размерах экрана, после которого арена может выгрузиться
  distanceScreens: number;

  // Как часто проверять расстояние, в миллисекундах
  checkIntervalMs?: number;
}

export type ResolvedArenasOptions = Omit<ArenasOptions, "unload"> & {
  unload?: Required<ArenaUnloadOptions>;
};

export type ArenaObjectSnapshot =
  | { destroyed: true }
  | { destroyed: false; state: StateValue };

export interface ArenaSnapshot {
  version: 1;
  objects: Record<string, ArenaObjectSnapshot>;
}
