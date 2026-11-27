export interface SleepSettings {
  // Расстояние до игрока в ширинах и высотах экрана, после которого объект засыпает
  distanceScreens: number;
}

export interface AudioSettings {
  master: number;
  effects: number;
  music: number;
}

export interface ArenasSettings {
  distanceScreens: number;
}

export interface BaseGameSettings {
  audio: AudioSettings;
  sleep: SleepSettings | null;
  arenas: ArenasSettings | null;
}

export type SettingsValues<T extends object> = BaseGameSettings & Omit<T, keyof BaseGameSettings>;
