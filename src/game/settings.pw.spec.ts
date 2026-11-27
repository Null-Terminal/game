import { expect, test } from "@playwright/test";

import type * as interactionFixture from "#game/tests/fixture";
import type * as projectSettings from "#game/settings";

test("game starts with settings restored from IndexedDB", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  await page.evaluate(async () => {
    const modulePath = "/src/engine/storage.ts";
    const { createGameStorage } = await import(modulePath);
    const storage = createGameStorage();

    await storage.put("settings", "game", {
      audio: { master: 0.7, effects: 0.4, music: 0.2 },
      dynamicEffects: false,
      controls: { keyboard: { jetpack: "KeyW" } },
      sleep: { distanceScreens: 4 }
    });
  });

  await page.goto("/game.html");

  await expect(page.locator("#loading")).toBeHidden();
  await page.locator("game-menu").locator("#settings").click();
  await expect(page.locator("game-settings-panel").locator("#dynamic-effects")).not.toBeChecked();
  await expect(page.locator("game-settings-panel").locator('[data-keyboard-control="jetpack"]')).toHaveText("KeyW");
});

test("player controls follow changed bindings", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const fixtureUrl = "/src/game/tests/fixture.ts";
  const scene = await page.evaluateHandle(async (url) => {
    const { createInteractionScene } = await import(url) as typeof interactionFixture;
    return createInteractionScene();
  }, fixtureUrl);

  const result = await scene.evaluate(async ({ player, destroy }) => {
    const settingsPath = "/src/game/settings.ts";
    const { defaultProjectSettings } = await import(settingsPath) as typeof projectSettings;
    const controls = structuredClone(defaultProjectSettings.controls);
    controls.keyboard.jetpack = "KeyW";
    player.game.settings.set("controls", controls);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp" }));
    const oldKey = player.actions.has("jetpack");

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    const newKey = player.actions.has("jetpack");

    player.game.settings.set("controls", {
      ...controls,
      keyboard: { ...controls.keyboard, jetpack: "KeyQ" }
    });
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    const released = player.actions.has("jetpack");

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyQ" }));
    const rebound = player.actions.has("jetpack");

    destroy();
    return { oldKey, newKey, released, rebound };
  });

  expect(result).toEqual({ oldKey: false, newKey: true, released: false, rebound: true });
});
