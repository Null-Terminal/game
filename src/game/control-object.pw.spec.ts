import { expect, test } from "@playwright/test";

import { createInteractionScene } from "#game/tests/browser";

test("a lever changes state once per use key press", async ({ page }) => {
  const scene = await createInteractionScene(page);

  const result = await scene.evaluate(({ player, createControl, destroy }) => {
    const lever = createControl("floorLever");

    lever.visit(player);
    const withoutInput = lever.active;

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    lever.visit(player);
    const activated = lever.active && lever.nowPlaying === lever.options.showActivate;

    lever.visit(player);
    const onlyOnce = lever.active;

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyE" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    lever.visit(player);
    const deactivated = !lever.active && lever.nowPlaying === lever.options.showDeactivate;

    destroy();
    return { withoutInput, activated, onlyOnce, deactivated };
  });

  expect(result).toEqual({
    withoutInput: false,
    activated: true,
    onlyOnce: true,
    deactivated: true
  });
});

test("a button without a deactivate animation does not latch active", async ({ page }) => {
  const scene = await createInteractionScene(page);

  const result = await scene.evaluate(({ player, createControl, destroy }) => {
    const button = createControl("accessButton");

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    button.visit(player);

    const showingPress = button.nowPlaying === button.options.showActivate;
    const active = button.active;

    destroy();
    return { showingPress, active };
  });

  expect(result).toEqual({
    showingPress: true,
    active: false
  });
});
