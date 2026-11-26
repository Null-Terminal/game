import { expect, test } from "@playwright/test";

import type * as interactionFixture from "#game/tests/fixture";
import type * as platformFixture from "#game/platforms/tests/moving-platform";
import type * as projectSettings from "#game/settings";
import type * as engineInput from "#engine/input";

type TestWindow = Window & { fakeGamepadButtons?: { pressed: boolean }[] };

test("Game owns the same input used by the player and destroys it", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async () => {
    const fixtureUrl = "/src/game/tests/fixture.ts";
    const { createInteractionScene } = await import(fixtureUrl) as typeof interactionFixture;
    const scene = await createInteractionScene();
    const input = scene.game.input;
    const shared = scene.player.input === input;

    scene.destroy();
    return { shared, destroyed: input.destroyed };
  });

  expect(result).toEqual({ shared: true, destroyed: true });
});

test("gamepad selection stays on the connected device until it disconnects", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const selected = await page.evaluate(async () => {
    const modulePath = "/src/engine/input.ts";
    const { GamepadInput } = await import(modulePath) as typeof engineInput;
    const first = { id: "first", connected: true, mapping: "" };
    const second = { id: "second", connected: true, mapping: "standard" };

    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [first, second]
    });

    const initial = GamepadInput.getGamepad()?.id;
    first.connected = false;
    const afterDisconnect = GamepadInput.getGamepad()?.id;
    first.connected = true;
    const afterReconnect = GamepadInput.getGamepad()?.id;
    second.connected = false;
    const afterSecondDisconnect = GamepadInput.getGamepad()?.id;

    return { initial, afterDisconnect, afterReconnect, afterSecondDisconnect };
  });

  expect(selected).toEqual({
    initial: "first",
    afterDisconnect: "second",
    afterReconnect: "second",
    afterSecondDisconnect: "first"
  });
});

test("input keeps a snapshot of keyboard and gamepad bindings", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async () => {
    const modulePath = "/src/engine/input.ts";
    const { Input } = await import(modulePath) as typeof engineInput;
    const keyboard = new Map<string, "left" | "jump">([["KeyA", "left"]]);
    const gamepadKey = { button: 3 };
    const gamepad = new Map<engineInput.GamepadBinding, "left" | "jump">([[gamepadKey, "jump"]]);
    const input = new Input(["left", "jump"] as const, { keyboard, gamepad });

    keyboard.set("KeyA", "jump");
    gamepadKey.button = 5;
    gamepad.clear();

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyA" }));
    const keyboardSnapshot = input.held.has("left") && !input.held.has("jump");
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyA" }));

    const buttons = Array.from({ length: 6 }, () => ({ pressed: false }));
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [{ connected: true, mapping: "", buttons, axes: [] }]
    });

    buttons[3]!.pressed = true;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const gamepadSnapshot = input.held.has("jump");

    input.destroy();
    return { keyboardSnapshot, gamepadSnapshot };
  });

  expect(result).toEqual({ keyboardSnapshot: true, gamepadSnapshot: true });
});

test("keyboard, touch, and gamepad sources share actions without releasing each other", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const fixtureUrl = "/src/game/tests/fixture.ts";
  const scene = await page.evaluateHandle(async (url) => {
    const { createInteractionScene } = await import(url) as typeof interactionFixture;
    return createInteractionScene();
  }, fixtureUrl);

  const result = await scene.evaluate(async ({ player, destroy }) => {
    const input = player.input;
    const nextFrame = async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    };

    input.press("touch:1", "right");
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowRight" }));
    input.release("touch:1");
    const keyboardStillHeld = player.actions.has("right");

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowRight" }));
    const released = !player.actions.has("right");

    const buttons = Array.from({ length: 16 }, () => ({ value: 0, pressed: false }));
    const axes = [0, 0];
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [{ connected: true, mapping: "standard", buttons, axes }]
    });

    buttons[0]!.value = 1;
    await nextFrame();
    const jumpPress = input.consumePress("jump") && !input.consumePress("jump");

    buttons[2]!.pressed = true;
    await nextFrame();
    const pressedFlagWorks = input.consumePress("use");

    player.game.status.pause();
    player.game.status.resume();
    await nextFrame();
    const heldButtonIgnoredAfterResume = !player.actions.has("jump");

    buttons[0]!.value = 0;
    await nextFrame();
    buttons[0]!.value = 1;
    await nextFrame();
    const newPressWorks = input.consumePress("jump");

    axes[0] = -0.7;
    await nextFrame();
    const stickMovesLeft = player.actions.has("left");

    destroy();
    return { keyboardStillHeld, released, jumpPress, pressedFlagWorks, heldButtonIgnoredAfterResume, newPressWorks, stickMovesLeft };
  });

  expect(result).toEqual({
    keyboardStillHeld: true,
    released: true,
    jumpPress: true,
    pressedFlagWorks: true,
    heldButtonIgnoredAfterResume: true,
    newPressWorks: true,
    stickMovesLeft: true
  });
});

test("a quick press reaches the next game update and expires after it", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async () => {
    const fixtureUrl = "/src/game/tests/fixture.ts";
    const { createInteractionScene } = await import(fixtureUrl) as typeof interactionFixture;
    const { player, canvas, destroy } = await createInteractionScene();
    const input = player.input;

    input.press("test:jump", "jump");
    input.release("test:jump");

    const releasedBeforeUpdate = !input.held.has("jump");
    const quickPressReceived = input.consumePress("jump") && !input.consumePress("jump");

    input.press("test:use", "use");
    input.release("test:use");

    const frame = { ctx: canvas.canvas.getContext("2d")!, delta: 0, now: 0 };
    canvas.events.ui.emit(frame);

    const expiredAfterUpdate = !input.consumePress("use");

    destroy();
    return { releasedBeforeUpdate, quickPressReceived, expiredAfterUpdate };
  });

  expect(result).toEqual({ releasedBeforeUpdate: true, quickPressReceived: true, expiredAfterUpdate: true });
});

test("a gamepad without a standard mapping starts the game and controls the pause menu", async ({ page }) => {
  await page.goto("/game.html");

  await page.evaluate(() => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [{ connected: true, mapping: "", buttons, axes: [0, 0] }]
    });
    (window as TestWindow).fakeGamepadButtons = buttons;
  });

  const menu = page.locator("game-menu");
  await expect(menu).toBeVisible();
  await expect(menu.locator("#gamepad-status")).toContainText("Геймпад подключён без стандартной раскладки");
  await expect(menu.locator("#gamepad-status")).toContainText("Вибрация через браузер недоступна");

  await page.evaluate(() => (window as TestWindow).fakeGamepadButtons![0]!.pressed = true);
  await expect(menu).toBeHidden();

  await page.evaluate(() => (window as TestWindow).fakeGamepadButtons![0]!.pressed = false);
  await page.evaluate(() => (window as TestWindow).fakeGamepadButtons![9]!.pressed = true);
  await expect(menu).toBeVisible();

  await page.evaluate(() => (window as TestWindow).fakeGamepadButtons![9]!.pressed = false);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.evaluate(() => (window as TestWindow).fakeGamepadButtons![9]!.pressed = true);
  await expect(menu).toBeHidden();
});

test("gamepad button and axis bindings follow settings, including pause", async ({ page }) => {
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
    controls.gamepad.jump = [{ button: 5 }];
    controls.gamepad.left = [{ axis: 2, direction: -1 }];
    controls.gamepad.pause = [{ button: 6 }];
    player.game.settings.set("controls", controls);

    const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
    const axes = [0, 0, 0];
    const nextFrame = async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    };

    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [{ connected: true, mapping: "", buttons, axes }]
    });

    buttons[0]!.pressed = true;
    await nextFrame();
    const oldJumpIgnored = !player.actions.has("jump");

    buttons[5]!.pressed = true;
    axes[2] = -0.7;
    await nextFrame();
    const reboundJump = player.actions.has("jump");
    const reboundAxis = player.actions.has("left");

    buttons[6]!.pressed = true;
    await nextFrame();
    const pauseWorks = player.game.status.paused;

    destroy();
    return { oldJumpIgnored, reboundJump, reboundAxis, pauseWorks };
  });

  expect(result).toEqual({ oldJumpIgnored: true, reboundJump: true, reboundAxis: true, pauseWorks: true });
});

test("jetpack vibration follows intensity and stops at zero", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const fixtureUrl = "/src/game/platforms/tests/moving-platform.ts";
  const scene = await page.evaluateHandle(async (url) => {
    const { createMovingPlatformScene } = await import(url) as typeof platformFixture;
    return createMovingPlatformScene({ platformSpeed: 0 });
  }, fixtureUrl);

  const effects = await scene.evaluate(({ player, step, destroy }) => {
    const effects: GamepadEffectParameters[] = [];

    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [{
        connected: true,
        mapping: "standard",
        axes: [0, 0],
        buttons: [],
        vibrationActuator: {
          playEffect: (_type: string, params: GamepadEffectParameters) => {
            effects.push(params);
            return Promise.resolve("complete");
          }
        }
      }]
    });

    step(1 / 60, 1000 / 60);
    step(1 / 60, 2000 / 60);
    player.input.release("test:jetpack");
    step(1 / 60, 3000 / 60);
    player.game.settings.set("vibrationIntensity", 0.5);
    player.input.press("test:jetpack", "jetpack");
    step(1 / 60, 4000 / 60);

    player.input.release("test:jetpack");
    step(1 / 60, 5000 / 60);
    player.game.settings.set("vibrationIntensity", 0);
    player.input.press("test:jetpack", "jetpack");
    step(1 / 60, 6000 / 60);

    destroy();
    return effects;
  });

  expect(effects).toEqual([
    { duration: 200, strongMagnitude: 0.15, weakMagnitude: 0.6 },
    { duration: 200, strongMagnitude: 0.075, weakMagnitude: 0.3 }
  ]);
});
