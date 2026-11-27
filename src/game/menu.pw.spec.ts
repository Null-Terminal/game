import { expect, test } from "@playwright/test";

import type * as storageModule from "#engine/storage";
import type * as engineInputModule from "#engine/input";
import type { GameMenu } from "#game/menu";
import type { GameInput } from "#game/input";

type TestGamepadWindow = Window & {
  testGamepad?: { buttons: { pressed: boolean; value: number }[]; axes: number[] };
  testGamepads?: { connected: boolean; buttons: { pressed: boolean; value: number }[]; axes: number[] }[];
};

test("defeat opens a restart dialog instead of restarting immediately", async ({ page }) => {
  await page.goto("/game.html");

  const menu = page.locator("game-menu");
  await menu.locator("#start").click();
  await expect(menu).toBeHidden();

  await menu.evaluate((element: GameMenu) => element.game!.status.finish());

  const dialog = menu.getByRole("alertdialog", { name: "Вы проиграли" });
  const restart = dialog.getByRole("button", { name: "Начать заново" });
  await expect(dialog).toBeVisible();
  await expect(restart).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect.poll(() => menu.evaluate((element: GameMenu) => element.game!.status.finished)).toBe(true);

  await restart.click();
  await expect(menu).toBeHidden();
  await expect.poll(() => menu.evaluate((element: GameMenu) => element.game!.status.playing)).toBe(true);
});

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

  await menu.getByRole("button", { name: "Назад", exact: true }).click();
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

test("gamepad settings appear only while a gamepad is connected", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [] });
  });
  await page.goto("/game.html");
  await page.locator("game-menu").locator("#settings").click();

  const section = page.locator("game-settings-panel").locator("#gamepad-settings");
  await expect(section).toBeHidden();

  await page.evaluate(() => {
    const pads = [{ id: "Test Gamepad", connected: true, mapping: "standard", buttons: [], axes: [] }];
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => pads });
    (window as TestGamepadWindow).testGamepads = pads;
  });
  await expect(section).toBeVisible();

  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepads![0]!.connected = false;
  });
  await expect(section).toBeHidden();
});

test("Space activates the focused start button while game input is inactive", async ({ page }) => {
  await page.goto("/game.html");

  const menu = page.locator("game-menu");
  await expect(menu.locator("#start")).toBeFocused();
  await page.keyboard.press("Space");
  await expect(menu).toBeHidden();
});

test("unmapped Razer Raiju uses Cross, not Square, to confirm in the menu", async ({ page }) => {
  await page.goto("/game.html");

  const menu = page.locator("game-menu");
  await page.evaluate(() => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [{ id: "Razer Raiju Tournament Edition (Vendor: 1532 Product: 100a)", connected: true, mapping: "", buttons, axes: [0, 0] }]
    });
    (window as TestGamepadWindow).testGamepad = { buttons, axes: [0, 0] };
  });
  await expect(menu.locator("#gamepad-status")).toContainText("без стандартной раскладки");

  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepad!.buttons[0]!.pressed = true;
  });
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await expect(menu).toBeVisible();

  await page.evaluate(() => {
    const buttons = (window as TestGamepadWindow).testGamepad!.buttons;
    buttons[0]!.pressed = false;
    buttons[1]!.pressed = true;
  });
  await expect(menu).toBeHidden();
});

test("gamepad choice and layout apply to both menu and gameplay", async ({ page }) => {
  await page.goto("/game.html");

  const menu = page.locator("game-menu");
  await page.evaluate(() => {
    const pads = [0, 1].map((index) => ({
      id: `Геймпад ${index + 1}`,
      connected: true,
      mapping: "",
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
      axes: [0, 0]
    }));

    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => pads });
    (window as TestGamepadWindow).testGamepads = pads;
  });

  await menu.locator("#settings").click();
  const panel = menu.locator("game-settings-panel");
  const devices = panel.locator("#gamepad-device");
  await expect(devices.locator("option")).toHaveCount(2);
  await devices.selectOption("1");
  await expect(devices).toHaveValue("1");
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const layout = panel.locator("#gamepad-layout");
  await layout.focus();
  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepads![1]!.buttons[15]!.pressed = true;
  });
  await expect(layout).toHaveValue("xbox");
  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepads![1]!.buttons[15]!.pressed = false;
  });
  await menu.locator("#back").click();
  await menu.locator("#start").focus();

  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepads![0]!.buttons[0]!.pressed = true;
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(menu).toBeVisible();

  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepads![1]!.buttons[0]!.pressed = true;
  });
  await expect(menu).toBeHidden();

  await page.evaluate(() => {
    const pad = (window as TestGamepadWindow).testGamepads![1]!;
    pad.buttons[0]!.pressed = false;
    pad.buttons[14]!.pressed = true;
  });
  await expect.poll(() => menu.evaluate((element: GameMenu) =>
    (element.game!.input as GameInput).held.has("left"))).toBe(true);

  await page.evaluate(async () => {
    const inputPath = "/src/engine/input.ts";
    const { GamepadInput } = await import(inputPath) as typeof engineInputModule;
    GamepadInput.selectGamepad(0);
  });
  await expect.poll(() => menu.evaluate((element: GameMenu) =>
    (element.game!.input as GameInput).held.has("left"))).toBe(false);

  await page.evaluate(async () => {
    const inputPath = "/src/engine/input.ts";
    const { GamepadInput } = await import(inputPath) as typeof engineInputModule;
    GamepadInput.selectGamepad(1);
  });

  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepads![0]!.buttons[9]!.pressed = true;
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(menu).toBeHidden();

  await page.evaluate(() => {
    const pad = (window as TestGamepadWindow).testGamepads![1]!;
    pad.buttons[9]!.pressed = true;
  });
  await expect(menu).toBeVisible();

  await page.reload();
  await page.locator("game-menu").locator("#settings").click();
  const restoredPanel = page.locator("game-settings-panel");
  await expect(restoredPanel.locator("#gamepad-layout")).toHaveValue("xbox");

  await page.evaluate(() => {
    const pads = [0, 1].map((index) => ({
      id: `Геймпад ${index + 1}`,
      connected: index === 0,
      mapping: "",
      buttons: [],
      axes: []
    }));

    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => pads });
    (window as TestGamepadWindow).testGamepads = pads;
  });

  const restoredDevices = restoredPanel.locator("#gamepad-device");
  await expect(restoredDevices.locator("option")).toHaveCount(1);
  await expect(restoredDevices).toHaveValue("0");
  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepads![1]!.connected = true;
  });
  await expect(restoredDevices.locator("option")).toHaveCount(2);
  await expect(restoredDevices).toHaveValue("1");
});

test("gamepad focus order survives a click outside the menu controls", async ({ page }) => {
  await page.goto("/game.html");

  const menu = page.locator("game-menu");
  await page.evaluate(() => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [{ id: "Standard Gamepad", connected: true, mapping: "standard", buttons, axes: [0, 0] }]
    });
    (window as TestGamepadWindow).testGamepad = { buttons, axes: [0, 0] };
  });
  await expect(menu.locator("#gamepad-status")).toContainText("Геймпад подключён");

  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepad!.buttons[13]!.pressed = true;
  });
  await expect(menu.locator("#settings")).toBeFocused();

  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepad!.buttons[13]!.pressed = false;
  });
  await menu.locator(".backdrop").click({ position: { x: 10, y: 10 } });
  await expect(menu.locator("#settings")).toBeFocused();
  await expect(menu.locator("#settings")).toHaveCSS("outline-style", "solid");
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepad!.buttons[13]!.pressed = true;
  });
  await expect(menu.locator("#start")).toBeFocused();

  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepad!.buttons[13]!.pressed = false;
    (window as TestGamepadWindow).testGamepad!.buttons[0]!.pressed = true;
  });
  await expect(menu).toBeHidden();
});

test("clicking empty settings space keeps the current focus visible", async ({ page }) => {
  await page.goto("/game.html");
  const menu = page.locator("game-menu");
  await menu.locator("#settings").click();
  const panel = menu.locator("game-settings-panel");
  await panel.locator("#master").focus();
  await panel.locator("h2").first().click();
  await expect(panel.locator("#master")).toBeFocused();
  await expect(panel.locator("#master")).toHaveCSS("outline-style", "solid");
});

test("Raiju confirms selects and switches settings groups with shoulder buttons", async ({ page }) => {
  await page.goto("/game.html");

  const menu = page.locator("game-menu");
  await page.evaluate(() => {
    const pads = [0, 1].map((index) => ({
      id: `Raiju ${index + 1}`,
      connected: true,
      mapping: "",
      buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })),
      axes: [0, 0, 0, -1, -1, 0]
    }));

    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => pads });
    (window as TestGamepadWindow).testGamepads = pads;
  });

  await menu.locator("#settings").click();
  const panel = menu.locator("game-settings-panel");
  const devices = panel.locator("#gamepad-device");
  await expect(devices.locator("option")).toHaveCount(2);
  await devices.focus();
  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepads![0]!.buttons[1]!.pressed = true;
  });
  await expect(devices).toHaveValue("1");

  await panel.locator("#master").focus();
  await page.evaluate(() => {
    const pad = (window as TestGamepadWindow).testGamepads![1]!;
    pad.axes[4] = 1;
    pad.buttons[7]!.pressed = true;
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(panel.locator("#master")).toBeFocused();
  await page.evaluate(() => {
    const pad = (window as TestGamepadWindow).testGamepads![1]!;
    pad.axes[4] = -1;
    pad.buttons[7]!.pressed = false;
    pad.buttons[5]!.pressed = true;
  });
  await expect(panel.locator("#dynamic-effects")).toBeFocused();

  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepads![1]!.buttons[5]!.pressed = false;
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepads![1]!.buttons[5]!.pressed = true;
  });
  await expect(panel.locator('[data-keyboard-control="left"]')).toBeFocused();

  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepads![1]!.buttons[5]!.pressed = false;
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepads![1]!.buttons[5]!.pressed = true;
  });
  await expect(devices).toBeFocused();

  await page.evaluate(() => {
    const pad = (window as TestGamepadWindow).testGamepads![1]!;
    pad.buttons[5]!.pressed = false;
    pad.buttons[4]!.pressed = true;
  });
  await expect(panel.locator('[data-keyboard-control="left"]')).toBeFocused();

  const layout = panel.locator("#gamepad-layout");
  await layout.focus();
  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepads![1]!.buttons[1]!.pressed = true;
  });
  await expect(layout).toHaveValue("xbox");
});

test("standard gamepad uses bumpers instead of triggers for settings groups", async ({ page }) => {
  await page.goto("/game.html");

  const menu = page.locator("game-menu");
  await page.evaluate(() => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [{ id: "Standard Gamepad", connected: true, mapping: "standard", buttons, axes: [0, 0] }]
    });
    (window as TestGamepadWindow).testGamepad = { buttons, axes: [0, 0] };
  });

  await menu.locator("#settings").click();
  const panel = menu.locator("game-settings-panel");
  await panel.locator("#master").focus();
  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepad!.buttons[7]!.pressed = true;
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(panel.locator("#master")).toBeFocused();

  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepad!.buttons[5]!.pressed = true;
  });
  await expect(panel.locator("#dynamic-effects")).toBeFocused();

  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepad!.buttons[4]!.pressed = true;
  });
  await expect(panel.locator("#master")).toBeFocused();
});

test("menu buttons are saved for each gamepad and can be reset", async ({ page }) => {
  await page.goto("/game.html");
  await page.evaluate(() => {
    const pads = ["Pad A", "Pad B"].map((id) => ({
      id,
      connected: true,
      mapping: "standard",
      buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })),
      axes: [0, 0]
    }));

    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => pads });
    (window as TestGamepadWindow).testGamepads = pads;
  });

  const menu = page.locator("game-menu");
  await menu.locator("#settings").click();
  const panel = menu.locator("game-settings-panel");
  const devices = panel.locator("#gamepad-device");
  const confirm = panel.locator('[data-menu-gamepad="confirm"]');
  await expect(devices.locator("option")).toHaveCount(2);
  await expect(confirm).toHaveText("Кнопка 0");

  await confirm.click();
  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepads![0]!.buttons[17]!.pressed = true;
  });
  await expect(confirm).toHaveText("Кнопка 17");
  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepads![0]!.buttons[17]!.pressed = false;
  });

  await devices.selectOption("1");
  await expect(confirm).toHaveText("Кнопка 0");
  await devices.selectOption("0");
  await expect(confirm).toHaveText("Кнопка 17");

  await expect.poll(() => page.evaluate(async () => {
    const storagePath = "/src/engine/storage.ts";
    const { createGameStorage } = await import(storagePath) as typeof storageModule;
    const saved = await createGameStorage().get<{ menuGamepadProfiles?: { id: string }[] }>("settings", "game");
    return saved?.menuGamepadProfiles?.[0]?.id;
  })).toBe("Pad A");

  await menu.locator("#back").click();
  await menu.locator("#start").focus();
  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepads![0]!.buttons[0]!.pressed = true;
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(menu).toBeVisible();
  await page.evaluate(() => {
    const buttons = (window as TestGamepadWindow).testGamepads![0]!.buttons;
    buttons[0]!.pressed = false;
    buttons[17]!.pressed = true;
  });
  await expect(menu).toBeHidden();

  await page.reload();
  await page.evaluate(() => {
    const buttons = Array.from({ length: 18 }, () => ({ pressed: false, value: 0 }));
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [{ id: "Pad A", connected: true, mapping: "standard", buttons, axes: [0, 0] }]
    });
  });
  await menu.locator("#settings").click();
  await expect(confirm).toHaveText("Кнопка 17");

  await panel.locator("#reset-menu-gamepad").click();
  await expect(confirm).toHaveText("Кнопка 0");
  await expect(panel.locator("#reset-menu-gamepad")).toBeDisabled();
});

test("gamepad bindings can be captured and restored from settings", async ({ page }) => {
  await page.goto("/game.html");

  const menu = page.locator("game-menu");
  await menu.locator("#settings").click();
  const panel = menu.locator("game-settings-panel");

  await page.evaluate(() => {
    const buttons = Array.from({ length: 18 }, () => ({ pressed: false, value: 0 }));
    const axes = [0, 0, 0, -1];
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

  const addPause = panel.locator('[data-gamepad-add="pause"]');
  await addPause.click();
  await expect(addPause).toContainText("Нажмите");
  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepad!.buttons[17]!.value = 0.8;
  });
  await expect(panel.locator('[data-gamepad-values="pause"]')).toContainText("Кнопка 17");

  await expect.poll(() => page.evaluate(async () => {
    const storagePath = "/src/engine/storage.ts";
    const { createGameStorage } = await import(storagePath) as typeof storageModule;
    const stored = await createGameStorage().get<{ controls?: { gamepad?: { left?: unknown[] } } }>("settings", "game");
    return stored?.controls?.gamepad?.left?.length;
  })).toBe(3);

  await page.evaluate(() => {
    const gamepad = (window as TestGamepadWindow).testGamepad!;
    gamepad.axes[2] = 0;
    gamepad.buttons[17]!.value = 0;
  });
  await menu.locator("#back").click();
  await menu.locator("#start").click();
  await expect(menu).toBeHidden();

  await page.evaluate(() => {
    (window as TestGamepadWindow).testGamepad!.buttons[17]!.value = 0.8;
  });
  await expect(menu).toBeVisible();

  await page.reload();
  await page.locator("game-menu").locator("#settings").click();
  await expect(page.locator("game-settings-panel").locator('[data-gamepad-values="jetpack"]')).toContainText("Кнопка 5");
  await expect(page.locator("game-settings-panel").locator('[data-gamepad-values="left"]')).toContainText("Ось 2 −");
});
