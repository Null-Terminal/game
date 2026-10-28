export type MovePoint = [x: number, y: number];
export type MovementOptions = PathMovement | FunctionMovement | SineMovement | CircleMovement;

export type MoveSpeed = number | ((elapsed: number) => number);

export interface SpeedOptions {
  speed?: MoveSpeed;
}

export type MovePath = MovePoint[];

export interface PathMovement extends SpeedOptions {
  path: MovePath;
  tolerance?: number;
}

export interface SineMovement {
  sine: Sine;
}

export interface Sine extends SpeedOptions {
  // Ось, вдоль которой объект проходит length и возвращается назад.
  // По другой оси смещение равно синусу этого прохода, умноженному на амплитуду.
  // Если "x" — проход по горизонтали, волна вверх и вниз, а если "y" — проход по вертикали, волна влево и вправо.
  axis?: "x" | "y";
  amplitude: number;
  length: number;
  period: number;
  origin?: MovePoint;
}

export interface CircleMovement {
  circle: Circle;
}

export interface Circle extends SpeedOptions {
  center: MovePoint;
  radius: number;
  period: number;
}

export interface FunctionMovement extends SpeedOptions {
  // Значение distance зависит от того, задан ли параметр speed.
  // Без speed — это секунды с запуска движения (пауза их не увеличивает),
  // а функция по этому времени сама возвращает точку, в которую нужно переместить объект.
  // Если speed задан — это параметр кривой в единицах самой функции,
  // и драйвер меняет его так, чтобы объект шёл со скоростью speed.
  // Если единица функции — пиксель пути, distance равен пройденному расстоянию.
  at: (distance: number) => MovePoint;
}
