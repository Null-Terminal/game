export function nanToInfinity(value: number): number {
  // Infinity - Infinity дает NaN, поэтому значение нужно нормализовать
  return Number.isNaN(value) ? Infinity : value;
}

export function calcBBoxArea(minX: number, minY: number, maxX: number, maxY: number): number {
  return nanToInfinity((maxX - minX) * (maxY - minY));
}
