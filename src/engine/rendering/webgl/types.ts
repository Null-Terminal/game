export type Rect = readonly [x: number, y: number, width: number, height: number];
export type Matrix = readonly [a: number, b: number, c: number, d: number, e: number, f: number];
export type RGBAColor = readonly [red: number, green: number, blue: number, alpha: number];

export interface ContextState {
  transform: Matrix;
  clip: Rect | null;
  alpha: number;
  fill: string;
  stroke: string;
  lineWidth: number;
  font: string;
  smoothing: boolean;
}
