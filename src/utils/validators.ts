export function isInRange(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max;
}

export function isPositive(value: number) {
  return Number.isFinite(value) && value > 0;
}
