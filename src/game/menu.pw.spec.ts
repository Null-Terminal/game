import { expect, test } from "@playwright/test";

import type * as storageModule from "#engine/storage";

type TestGamepadWindow = Window & {
  testGamepad?: { buttons: { pressed: boolean }[]; axes: number[] };
};

test("menu and settings reconnect without losing their handlers", async ({ page }) => {
  await page.goto("/game.html");

  const menu = page.locator("game-menu");
  await menu.evaluate((element) => {
    element.remove();
    document.body.append(element);
  });

  await menu.locator("#settings").click();
  const panel = menu.locator("game-settings-panel");
  await panel.evaluate((element) => {
    const parent = element.parentElement!;
    element.remove();
    parent.append(element);
  });

  await panel.locator("#dynamic-effects").uncheck();
  await expect(panel.locator("#dynamic-effects")).not.toBeChecked();

  await menu.locator("#back").click();
  await menu.locator("#start").click();
  await expect(menu).toBeHidden();

  await page.keyboard.press("Escape");
  await expect(menu).toBeVisible();
});

test("the menu starts the game, opens on pause, and applies settings", async ({ page }) => {
  await page.goto("/game.html");

  const menu = page.locator("game-menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("button", { name: "Начать игру" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(menu).toBeVisible();

  await menu.getByRole("button", { name: "Настройки" }).click();
  await expect(menu.getByRole("heading", { name: "Настройки" })).toBeVisible();

  const panel = menu.locator("game-settings-panel");
  await panel.locator("#master").evaluate((input: HTMLInputElement) => {
    input.value = "0.4";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await expect(panel.locator("#master-value")).toHaveText("40%");

  await panel.locator("#dynamic-effects").uncheck();
  await panel.locator("#sleep-distance").fill("5");
  await panel.locator("#sleep-distance").dispatchEvent("change");
  await panel.locator("#sleep").uncheck();
  await panel.locator("#sleep").check();
  await expect(panel.locator("#sleep-distance")).toHaveValue("5");

  await panel.getByRole("button", { name: "ArrowUp" }).click();
  await page.keyboard.press("KeyQ");
  await expect(panel.getByRole("button", { name: "KeyQ" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(menu.getByRole("heading", { name: "Меню игры" })).toBeVisible();
  await expect(menu).toBeVisible();

  await menu.getByRole("button", { name: "Начать игру" }).click();
  await expect(menu).toBeHidden();

  await page.keyboard.press("Escape");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("button", { name: "Продолжить" })).toBeVisible();

  await menu.getByRole("button", { name: "Настройки" }).click();
  await expect(panel.locator("#master-value")).toHaveText("40%");
  await expect(panel.locator("#dynamic-effects")).not.toBeChecked();
  await expect(panel.locator("#sleep-distance")).toHaveValue("5");
  await expect(panel.getByRole("button", { name: "KeyQ" })).toBeVisible();

  await menu.getByRole("button", { name: "Назад" }).click();
  await menu.getByRole("button", { name: "Продолжить" }).click();
  await expect(menu).toBeHidden();
});

test("vibration slider follows gamepad availability and keeps its value", async ({ page }) => {
  await page.goto("/game.html");
  await page.locator("game-menu").locator("#settings").click();

  const panel = page.locator("game-settings-panel");
  const slider = panel.locator("#vibration-intensity");
  await expect(slider).toBeDisabled();
  await expect(slider).toHaveValue("0");
  await expect(panel.locator("#vibration-intensity-value")).toHaveText("0%");

  await page.evaluate(() => {
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [{ connected: true, mapping: "standard", buttons: [], axes: [] }]
    });
  });
  await expect(slider).toBeDisabled();
  await expect(slider).toHaveValue("0");

  await page.evaluate(() => {
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [{
        connected: true,
        mapping: "standard",
        buttons: [],
        axes: [],
        vibrationActuator: { playEffect: () => Promise.resolve("complete") }
      }]
    });
  });

  await expect(slider).toBeEnabled();
  await expect(slider).toHaveValue("1");
  await slider.evaluate((input: HTMLInputElement) => {
    input.value = "0.35";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(panel.locator("#vibration-intensity-value")).toHaveText("35%");

  await page.evaluate(() => {
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [] });
  });
  await expect(slider).toBeDisabled();
  await expect(slider).toHaveValue("0");
  await expect(panel.locator("#vibration-intensity-value")).toHaveText("0%");

  await page.evaluate(() => {
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [{
        connected: true,
        mapping: "standard",
        buttons: [],
        axes: [],
        vibrationActuator: { playEffect: () => Promise.resolve("complete") }
      }]
    });
  });
  await expect(slider).toBeEnabled();
  await expect(slider).toHaveValue("0.35");

  await expect.poll(() => page.evaluate(async () => {
    const storagePath = "/src/engine/storage.ts";
    const { createGameStorage } = await import(storagePath) as typeof storageModule;
    const stored = await createGameStorage().get<{ vibrationIntensity?: number }>("settings", "game");
    return stored?.vibrationIntensity;
  })).toBe(0.35);
});

test("Space activates the focused start button while game input is inactive", async ({ page }) => {
  await page.goto("/game.html");

  const menu = page.locator("game-menu");
  await expect(menu.locator("#start")).toBeFocused();
  await page.keyboard.press("Space");
  await expect(menu).toBeHidden();
});

test("gamepad bindings can be captured and restored from settings", async ({ page }) => {
  await page.goto("/game.html");

  const menu = page.locator("game-menu");
  await menu.locator("#settings").click();
  const panel = menu.locator("game-settings-panel");

  await page.evaluate(() => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
    const axes = [0, 0, 0];
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [{ connected: true, mapping: "", buttons, axes }]
    });
    (window as TestGamepadWindow).testGamepad = { buttons, axes };
  });

  const addJetpack = panel.locator('[data-gamepad-add="jetpack"]');
  await addJetpack.click();
  await expect(addJetpack).toContainText("Нажмите");
  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepad!.buttons[5]!.pressed = true;
  });
  await expect(panel.locator('[data-gamepad-values="jetpack"]')).toContainText("Кнопка 5");

  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepad!.buttons[5]!.pressed = false;
  });
  const addLeft = panel.locator('[data-gamepad-add="left"]');
  await addLeft.click();
  await expect(addLeft).toContainText("Нажмите");
  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepad!.axes[2] = -0.8;
  });
  await expect(panel.locator('[data-gamepad-values="left"]')).toContainText("Ось 2 −");

  await expect.poll(() => page.evaluate(async () => {
    const storagePath = "/src/engine/storage.ts";
    const { createGameStorage } = await import(storagePath) as typeof storageModule;
    const stored = await createGameStorage().get<{ controls?: { gamepad?: { left?: unknown[] } } }>("settings", "game");
    return stored?.controls?.gamepad?.left?.length;
  })).toBe(3);

  await page.reload();
  await page.locator("game-menu").locator("#settings").click();
  await expect(page.locator("game-settings-panel").locator('[data-gamepad-values="jetpack"]')).toContainText("Кнопка 5");
  await expect(page.locator("game-settings-panel").locator('[data-gamepad-values="left"]')).toContainText("Ось 2 −");
});
