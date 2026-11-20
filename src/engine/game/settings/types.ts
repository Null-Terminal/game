export interface SleepSettings {
  // Расстояние до игрока в ширинах и высотах экрана, после которого объект засыпает
  distanceScreens: number;
}

export interface AudioSettings {
  master: number;
  effects: number;
  music: number;
}

export interface BaseGameSettings {
  audio: AudioSettings;
  sleep: SleepSettings | null;
  arenaUnload: { distanceScreens: number } | null;
}

export type SettingsValues<T extends object> = BaseGameSettings & Omit<T, keyof BaseGameSettings>;
