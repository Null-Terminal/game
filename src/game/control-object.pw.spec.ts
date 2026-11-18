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

test("a terminal restores its active state with its arena", async ({ page }) => {
  const scene = await createInteractionScene(page);

  const result = await scene.evaluate(async ({ game, player, ControlObject, destroy }) => {
    const world = game.world;
    const arena = await world.arenas.loadArena(() => ({
      objects: [[ControlObject, { kind: "aiTerminal", stateKey: "test-terminal", x: 400, y: 100 }]]
    }));

    const first = world.objects.get(ControlObject.kind, 0);

    if (!(first instanceof ControlObject)) {
      throw new Error("Expected a terminal in the arena");
    }

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    first.visit(player);
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyE" }));

    await world.arenas.unloadArena(arena);
    const snapshot = arena.serialize();
    await world.arenas.restoreArena(arena);

    const restored = world.objects.get(ControlObject.kind, 0);

    if (!(restored instanceof ControlObject)) {
      throw new Error("Expected a restored terminal");
    }

    const result = {
      savedActive: snapshot.objects["key:test-terminal"],
      active: restored.active,
      animationRestored: restored.nowPlaying === restored.options.showActivate
    };

    destroy();

    return result;
  });

  expect(result.savedActive).toMatchObject({ destroyed: false, state: { active: true } });
  expect(result.active).toBe(true);
  expect(result.animationRestored).toBe(true);
});
