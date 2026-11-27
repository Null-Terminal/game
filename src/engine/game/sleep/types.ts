export interface GameSleepOptions {
  // Доля расстояния засыпания, при которой объект просыпается
  wakeDistanceFactor?: number;

  // Интервал проверки расстояния в миллисекундах
  checkInterval?: number;
}
