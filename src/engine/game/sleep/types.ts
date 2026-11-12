export interface GameSleepOptions {
  // Расстояние до игрока в ширинах и высотах экрана, после которого объект засыпает
  distanceScreens: number;

  // Объект просыпается ближе этого расстояния; меньший порог предотвращает дрожание на границе
  wakeDistanceScreens?: number;

  // Интервал проверки расстояния в секундах
  checkIntervalSeconds?: number;
}

export interface GameOptions {
  sleep?: GameSleepOptions;
}
