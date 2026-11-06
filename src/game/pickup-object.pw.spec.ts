import { expect, test } from "@playwright/test";

import { createInteractionScene } from "#game/tests/browser";

test("fuel pickup refills a partial tank and disappears", async ({ page }) => {
  const scene = await createInteractionScene(page);

  const result = await scene.evaluate(({ player, createPickup, destroy }) => {
    player.updateStats(() => ({ fuel: 900 }));

    const fuel = createPickup("fuel");
    fuel.visit(player);

    const result = { fuel: player.stats.fuel, consumed: fuel.destroyed };

    destroy();
    return result;
  });

  expect(result).toEqual({ fuel: 920, consumed: true });
});

test("a full tank does not consume fuel pickup", async ({ page }) => {
  const scene = await createInteractionScene(page);

  const result = await scene.evaluate(({ player, createPickup, destroy }) => {
    const fuel = createPickup("fuel");
    fuel.visit(player);

    const result = {
      fuel: player.stats.fuel,
      fuelMax: player.stats.fuelMax,
      consumed: fuel.destroyed
    };

    destroy();
    return result;
  });

  expect(result.fuel).toBe(result.fuelMax);
  expect(result.consumed).toBe(false);
});

test("medkit heals up to the maximum health", async ({ page }) => {
  const scene = await createInteractionScene(page);

  const result = await scene.evaluate(({ player, createPickup, destroy }) => {
    player.updateStats(() => ({ hp: 90 }));

    const medkit = createPickup("medkit");
    medkit.visit(player);

    const result = { hp: player.stats.hp, consumed: medkit.destroyed };

    destroy();
    return result;
  });

  expect(result).toEqual({ hp: 100, consumed: true });
});
