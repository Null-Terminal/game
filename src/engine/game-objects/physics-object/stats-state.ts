import type { PhysicsObject } from "#engine/game-objects/physics-object";

export function registerPhysicsStatsState(go: PhysicsObject) {
  go.state.add("stats", {
    save: () => ({ ...go.stats }),

    validate: (value): value is Record<string, number | boolean> => {
      if (typeof value !== "object" || value == null || Array.isArray(value)) {
        return false;
      }

      const expected = new Map(Object.entries(go.stats));

      return Object.keys(value).length === expected.size && Object.entries(value).every(([key, saved]) => {
        const current = expected.get(key);

        return current !== undefined &&
          typeof saved === typeof current &&
          (typeof saved !== "number" || Number.isFinite(saved));
      });
    },

    restore: (value) => Object.assign(go.stats, value)
  });
}
