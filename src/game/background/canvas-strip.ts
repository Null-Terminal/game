// Запечённая горизонтальная полоса и её смещение от начала слоя
export interface CanvasStrip {
  canvas: OffscreenCanvas;
  top: number;
  sourceHeight: number;
}
