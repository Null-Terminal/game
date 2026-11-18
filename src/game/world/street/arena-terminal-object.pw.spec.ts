import { expect, test } from "@playwright/test";

import { createInteractionScene } from "#game/tests/browser";

test("the terminal loads and unloads its arena when used", async ({ page }) => {
  const scene = await createInteractionScene(page);

  const result = await scene.evaluate(async ({ game, player, createArenaTerminal, destroy }) => {
    const terminal = createArenaTerminal();
    const world = game.world;

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    terminal.visit(player);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const afterActivation = {
      active: terminal.active,
      arenas: world.arenas.size,
      spawnedCollisions: world.findCollisions(4890, 233, 5100, 500).length
    };

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyE" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    terminal.visit(player);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const afterDeactivation = {
      active: terminal.active,
      arenas: world.arenas.size,
      spawnedCollisions: world.findCollisions(4890, 233, 5100, 500).length
    };

    destroy();

    return { afterActivation, afterDeactivation };
  });

  expect(result.afterActivation).toEqual({
    active: true,
    arenas: 2,
    spawnedCollisions: 3
  });

  expect(result.afterDeactivation).toEqual({
    active: false,
    arenas: 1,
    spawnedCollisions: 0
  });
});

test("collected fuel stays gone when the terminal restores its arena", async ({ page }) => {
  const scene = await createInteractionScene(page);

  const result = await scene.evaluate(async ({ game, player, PickupObject, createArenaTerminal, destroy }) => {
    const terminal = createArenaTerminal();
    const world = game.world;

    async function useTerminal() {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
      terminal.visit(player);
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyE" }));

      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    function getFuel() {
      const fuel = world.objects.objects[PickupObject.kind]?.buffer[0];

      if (!(fuel instanceof PickupObject) || fuel.destroyed) {
        throw new Error("Expected active fuel in the arena");
      }

      return fuel;
    }

    await useTerminal();

    const firstArena = [...world.arenas].find((arena) => arena !== world.arenas.getByRef(world.arenas.refs["base"]!))!;
    const firstFuel = getFuel();
    const fuelBelongsToArena = firstFuel.arena === firstArena;

    player.updateStats(() => ({ fuel: 900 }));
    firstFuel.visit(player);

    const afterPickup = {
      playerFuel: player.stats.fuel,
      arenaObjects: firstArena.size,
      activeFuel: world.objects.objects[PickupObject.kind]?.length
    };

    await useTerminal();
    await useTerminal();

    const secondArena = [...world.arenas].find((arena) => arena !== world.arenas.getByRef(world.arenas.refs["base"]!))!;

    const afterReload = {
      sameArena: secondArena === firstArena,
      fuelAbsent: world.objects.objects[PickupObject.kind]?.length === 0,
      arenaObjects: secondArena.size,
      playerFuel: player.stats.fuel
    };

    destroy();

    return { fuelBelongsToArena, afterPickup, afterReload };
  });

  expect(result.fuelBelongsToArena).toBe(true);

  expect(result.afterPickup).toEqual({
    playerFuel: 920,
    arenaObjects: 3,
    activeFuel: 0
  });

  expect(result.afterReload).toEqual({
    sameArena: true,
    fuelAbsent: true,
    arenaObjects: 3,
    playerFuel: 920
  });
});

test("reusing a terminal does not keep its previous arena", async ({ page }) => {
  const scene = await createInteractionScene(page);

  const result = await scene.evaluate(async ({ game, player, createArenaTerminal, destroy }) => {
    const world = game.world;
    const terminal = createArenaTerminal();

    function useTerminal() {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
      terminal.visit(player);
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyE" }));
    }

    useTerminal();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const firstArena = [...world.arenas].find((arena) => arena !== world.arenas.getByRef(world.arenas.refs["base"]!))!;

    terminal.destroy();
    const reused = createArenaTerminal();

    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const afterDestroy = {
      reusedInstance: reused === terminal,
      oldArenaDestroyed: firstArena.destroyed,
      activeArenas: world.arenas.size
    };

    useTerminal();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const result = {
      afterDestroy,
      activeArenas: world.arenas.size,
      newArena: [...world.arenas].some((arena) =>
        arena !== world.arenas.getByRef(world.arenas.refs["base"]!) && arena !== firstArena)
    };

    destroy();

    return result;
  });

  expect(result).toEqual({
    afterDestroy: { reusedInstance: true, oldArenaDestroyed: true, activeArenas: 1 },
    activeArenas: 2,
    newArena: true
  });
});
