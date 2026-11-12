export interface CameraOptions {
  smoothness?: number;
  deadZone?: CameraDeadZone;
  limit?: CameraLimit;
}

export interface CameraLimit {
  x?: number;
  y?: number;
}

export interface CameraDeadZone {
  // Отступы от краёв экрана в процентах его ширины и высоты
  left: number;
  right: number;
  top: number;
  bottom: number;
}
