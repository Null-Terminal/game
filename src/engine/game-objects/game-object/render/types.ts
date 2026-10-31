import type { LoadedAnimation } from "#engine/animation-loader";
import type { RenderPayload } from "#engine/game";

export type ScrollFactor = [both: number] | [x: number, y: number];

export interface ObjectRenderPayload extends RenderPayload {
  x: number;
  y: number;

  // Время с начала текущего воспроизведения, в миллисекундах; учитывает паузу и скорость объекта
  elapsed: number;

  // Смещение камеры для заданного коэффициента; при 1 округляется до целого пикселя
  getScrollOffsetX(factor?: number): number;
  getScrollOffsetY(factor?: number): number;

  // Экранные координаты от положения объекта в начале кадра, независимо от изменений x/y
  getScreenX(factor?: number): number;
  getScreenY(factor?: number): number;

  // Верхняя координата изображения на холсте по его нижней экранной координате
  toCanvasTop(y: number): number;
}

export interface BitmapRenderPayload extends ObjectRenderPayload {
  pattern: boolean;
  frameIndex: number;
  animation: LoadedAnimation;
}

export type BitmapRenderFrame = (payload: BitmapRenderPayload) => void;
