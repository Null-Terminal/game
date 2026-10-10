export type MovePoint = [x: number, y: number];
export type MovementOptions = PathMovement | FunctionMovement | SineMovement | CircleMovement;

export type MoveSpeed = number | ((elapsed: number) => number);
export interface MoveSpeedOptions {
  speed?: MoveSpeed;
}

export interface MoveAlongPathOptions extends MoveSpeedOptions {
  tolerance?: number;
}

export type MovePath = MovePoint[];
export interface PathMovement extends MoveAlongPathOptions {
  path: MovePath;
}

export interface SineMovement {
  sine: SineMovementOptions;
}

export interface SineMovementOptions extends MoveSpeedOptions {
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
  circle: CircleMovementOptions;
}

export interface CircleMovementOptions extends MoveSpeedOptions {
  center: MovePoint;
  radius: number;
  period: number;
}

export interface FunctionMovement extends MoveSpeedOptions {
  // Значение distance зависит от того, задан ли параметр speed.
  // Без speed — это секунды с запуска движения (пауза их не увеличивает),
  // а функция по этому времени сама возвращает точку, в которую нужно переместить объект.
  // Если speed задан — это параметр кривой в единицах самой функции,
  // и драйвер меняет его так, чтобы объект шёл со скоростью speed.
  // Если единица функции — пиксель пути, distance равен пройденному расстоянию.
  at: (distance: number) => MovePoint;
}
