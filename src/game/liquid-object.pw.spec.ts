import { expect, test } from "@playwright/test";

import { createInteractionScene } from "#game/tests/browser";

test("water leaves health unchanged while acid damages per elapsed frame", async ({ page }) => {
  const scene = await createInteractionScene(page);

  const result = await scene.evaluate(({ player, canvas, createLiquid, destroy }) => {
    const water = createLiquid("water");
    const acid = createLiquid("acid");

    const initialHp = player.stats.hp;
    water.visit(player);
    const afterWater = player.stats.hp;

    acid.visit(player);
    const afterAcid = player.stats.hp;

    const result = {
      initialHp,
      afterWater,
      afterAcid,
      expectedDamage: 35 * canvas.delta
    };

    destroy();
    return result;
  });

  expect(result.afterWater).toBe(result.initialHp);
  expect(result.initialHp - result.afterAcid).toBeCloseTo(result.expectedDamage);
  expect(result.expectedDamage).toBeGreaterThan(0);
});
