import type { GameObject } from "#engine/game-objects/game-object";
import type { PositionSnapshot } from "#engine/game-objects/game-object/state/types";

export function registerPositionState(go: GameObject) {
  go.state.add("position", {
    save: () => {
      const { x, y } = go;
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    },

    validate: (value): value is PositionSnapshot | null => value === null ||
      (typeof value === "object" && !Array.isArray(value) &&
        "x" in value && "y" in value &&
        typeof value.x === "number" && typeof value.y === "number" &&
        Number.isFinite(value.x) && Number.isFinite(value.y)),

    restore: (value) => {
      if (value == null) {
        return;
      }

      go.x = value.x;
      go.y = value.y;
      go.prevX = value.x;
      go.prevY = value.y;
    }
  });
}
