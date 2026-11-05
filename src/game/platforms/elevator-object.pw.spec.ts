import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#game/platforms/elevator-object/tests/fixture";

test("player rides on the elevator roof along both axes", async ({ page }, testInfo) => {
  const scene = await createScene(page, { rider: "roof" });

  await expect.poll(() => getContactDistance(scene, "roof")).toBeLessThan(2);

  const roof = await page.locator("#game").screenshot({ path: testInfo.outputPath("roof.png") });
  await testInfo.attach("Player on elevator roof", { body: roof, contentType: "image/png" });

  const initial = await getSnapshot(scene);
  expect(initial.elevator.showingFloor).toBe(true);
  await goToStop(scene, 1);

  await expect.poll(async () => (await getSnapshot(scene)).elevator.x).toBeGreaterThan(initial.elevator.x + 95);
  await expect.poll(() => getContactDistance(scene, "roof")).toBeLessThan(2);
  expect((await getSnapshot(scene)).player.x).toBeGreaterThan(initial.player.x + 90);

  await goToStop(scene, 2);

  await expect.poll(async () => (await getSnapshot(scene)).elevator.y).toBeGreaterThan(initial.elevator.y + 95);
  await expect.poll(() => getContactDistance(scene, "roof")).toBeLessThan(2);
  expect((await getSnapshot(scene)).elevator.targetStop).toBe(2);

  await goToStop(scene, 0);

  await expect.poll(async () => (await getSnapshot(scene)).elevator.x).toBeLessThan(initial.elevator.x + 2);
  await expect.poll(async () => (await getSnapshot(scene)).elevator.y).toBeLessThan(initial.elevator.y + 2);
  await expect.poll(() => getContactDistance(scene, "roof")).toBeLessThan(2);
});

test("panel lights during travel and goes dark at each stop", async ({ page }) => {
  const scene = await createScene(page, { rider: "floor" });

  await expect.poll(() => getContactDistance(scene, "floor")).toBeLessThan(2);

  const initial = await getSnapshot(scene);

  await page.keyboard.down("e");
  await expect.poll(async () => (await getSnapshot(scene)).elevator.targetStop).toBe(1);
  await page.keyboard.up("e");

  await expect.poll(async () => (await getSnapshot(scene)).panel.active).toBe(true);
  await expect.poll(async () => (await getSnapshot(scene)).elevator.x).toBeGreaterThan(initial.elevator.x + 99);
  await expect.poll(() => getContactDistance(scene, "floor")).toBeLessThan(2);
  expect((await getSnapshot(scene)).player.x).toBeGreaterThan(initial.player.x + 90);
  await expect.poll(async () => (await getSnapshot(scene)).panel.active).toBe(false);

  await page.keyboard.down("e");
  await expect.poll(async () => (await getSnapshot(scene)).elevator.targetStop).toBe(2);
  await page.keyboard.up("e");

  await expect.poll(async () => (await getSnapshot(scene)).panel.active).toBe(true);
  await expect.poll(async () => (await getSnapshot(scene)).elevator.y).toBeGreaterThan(initial.elevator.y + 99);
  await expect.poll(() => getContactDistance(scene, "floor")).toBeLessThan(2);
  await expect.poll(async () => (await getSnapshot(scene)).panel.active).toBe(false);

  await page.keyboard.down("e");
  await expect.poll(async () => (await getSnapshot(scene)).elevator.targetStop).toBe(0);
  await page.keyboard.up("e");

  await expect.poll(async () => (await getSnapshot(scene)).panel.active).toBe(true);
  await expect.poll(async () => (await getSnapshot(scene)).elevator.y).toBeLessThan(initial.elevator.y + 1);
  await expect.poll(async () => (await getSnapshot(scene)).panel.active).toBe(false);
});

test("calling a stop replaces the initial movement", async ({ page }) => {
  const scene = await createScene(page, {
    rider: "roof",
    movement: { path: [[500, 100]], speed: 200 }
  });

  const initial = await getSnapshot(scene);
  await expect.poll(async () => (await getSnapshot(scene)).elevator.x).toBeGreaterThan(390);

  const moving = await getSnapshot(scene);
  expect(moving.panel.x - moving.elevator.x).toBeCloseTo(initial.panel.x - initial.elevator.x, 0);
  expect(moving.panel.y - moving.elevator.y).toBeCloseTo(initial.panel.y - initial.elevator.y, 0);

  await goToStop(scene, 0);

  await expect.poll(async () => (await getSnapshot(scene)).elevator.x).toBeLessThan(352);
  await expect.poll(() => getContactDistance(scene, "roof")).toBeLessThan(2);

  const returned = await getSnapshot(scene);
  expect(returned.panel.x - returned.elevator.x).toBeCloseTo(initial.panel.x - initial.elevator.x, 0);
  expect(returned.panel.y - returned.elevator.y).toBeCloseTo(initial.panel.y - initial.elevator.y, 0);
});

test("cabin ceiling blocks the player's jetpack from below", async ({ page }) => {
  const scene = await createScene(page, { rider: "floor" });
  await expect.poll(() => getContactDistance(scene, "floor")).toBeLessThan(2);

  await page.keyboard.down("ArrowUp");
  const contact = await observeCeilingContact(scene);
  await page.keyboard.up("ArrowUp");

  expect(contact.rise).toBeGreaterThan(30);
  expect(contact.penetration).toBeLessThan(2);
});

const fixtureUrl = "/src/game/platforms/elevator-object/tests/fixture.ts";

async function createScene(page: Page, options: fixture.ElevatorSceneOptions): Promise<JSHandle<fixture.ElevatorScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async ({ url, options }) => {
    const { createElevatorScene } = await import(url) as typeof fixture;
    return createElevatorScene(options);
  }, { url: fixtureUrl, options });
}

async function getSnapshot(scene: JSHandle<fixture.ElevatorScene>) {
  return scene.evaluate(({ elevator, panel, player }) => {
    return {
      elevator: {
        x: elevator.x,
        y: elevator.y,
        targetStop: elevator.targetStop,
        showingFloor: elevator.nowPlaying === elevator.options.show,
        floorTop: elevator.y + elevator.height,
        roofTop: elevator.render.ceilingBounds?.[3] ?? null
      },

      panel: {
        x: panel.x,
        y: panel.y,
        active: panel.nowPlaying === panel.options.showActive
      },

      player: { x: player.x, y: player.y }
    };
  });
}

async function goToStop(scene: JSHandle<fixture.ElevatorScene>, index: number) {
  await scene.evaluate(({ elevator }, index) => {
    elevator.goToStop(index);
  }, index);
}

async function getContactDistance(scene: JSHandle<fixture.ElevatorScene>, surface: "floor" | "roof") {
  const state = await getSnapshot(scene);
  const top = surface === "floor" ? state.elevator.floorTop : state.elevator.roofTop;
  return top == null ? Infinity : Math.abs(state.player.y - top);
}

async function observeCeilingContact(scene: JSHandle<fixture.ElevatorScene>) {
  return scene.evaluate(({ elevator, player }) => new Promise<{ rise: number; penetration: number }>((resolve) => {
    const startY = player.y;
    let highestY = startY;
    let deepestPenetration = -Infinity;
    let frames = 0;

    const sample = () => {
      highestY = Math.max(highestY, player.y);

      const ceilingBottom = elevator.render.ceilingBounds?.[1] ?? Infinity;
      deepestPenetration = Math.max(deepestPenetration, player.y + player.height - ceilingBottom);

      if (++frames < 60) {
        requestAnimationFrame(sample);
      } else {
        resolve({ rise: highestY - startY, penetration: deepestPenetration });
      }
    };

    requestAnimationFrame(sample);
  }));
}
