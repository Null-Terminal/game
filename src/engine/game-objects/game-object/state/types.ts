export type StateValue =
  | string
  | number
  | boolean
  | null
  | StateValue[]
  | { [key: string]: StateValue };

export interface StatePart<T extends StateValue> {
  save(): T;
  validate(value: unknown): value is T;
  restore(value: T): void;
}

export type PositionSnapshot = {
  x: number;
  y: number;
};
