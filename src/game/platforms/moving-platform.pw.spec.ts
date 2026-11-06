import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#game/platforms/tests/moving-platform";

const approaches = [
  { name: "a stationary platform blocks the jetpack", platformSpeed: 0, jetpackSpeed: 350, frames: 12 },

  { name: "a slowly descending platform blocks the jetpack", platformSpeed: 100, jetpackSpeed: 350, frames: 9 },
  { name: "a quickly descending platform blocks the jetpack", platformSpeed: 600, jetpackSpeed: 350, frames: 5 },
  { name: "a very fast platform still blocks the jetpack", platformSpeed: 1200, jetpackSpeed: 350, frames: 4 },

  { name: "a slow jetpack meets a descending platform", platformSpeed: 600, jetpackSpeed: 150, frames: 5 },
  { name: "a fast jetpack meets a descending platform", platformSpeed: 600, jetpackSpeed: 700, frames: 4 },

  { name: "a descending platform blocks the jetpack at 30 FPS", platformSpeed: 600, jetpackSpeed: 350, frames: 3, fps: 30 },
  { name: "a descending platform blocks the jetpack at 144 FPS", platformSpeed: 600, jetpackSpeed: 350, frames: 10, fps: 144 }
];

for (const { name, platformSpeed, jetpackSpeed, frames, fps = 60 } of approaches) {
  test(name, async ({ page }) => {
    const scene = await createScene(page, { platformSpeed, jetpackSpeed });

    const gaps = await scene.evaluate(({ player, platform, step, destroy }, { frames, fps }) => {
      const gaps: number[] = [];

      for (let frame = 1; frame <= frames; frame++) {
        step(1 / fps, frame * 1000 / fps);
        gaps.push(platform.y - (player.y + player.height));
      }

      destroy();
      return gaps;
    }, { frames, fps });

    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(-1);
    expect(gaps.some((gap) => Math.abs(gap) < 2)).toBe(true);
  });
}

for (const { name, platformSpeed } of [
  { name: "a descending platform carries its rider", platformSpeed: 100 },
  { name: "a rising platform carries its rider", platformSpeed: -100 },
  { name: "a quickly rising platform carries its rider", platformSpeed: -600 }
]) {
  test(name, async ({ page }) => {
    const scene = await createScene(page, { platformSpeed, playerY: 250, jetpack: false });

    const gaps = await scene.evaluate(({ player, platform, step, destroy }) => {
      const gaps: number[] = [];

      for (let frame = 1; frame <= 8; frame++) {
        step(1 / 60, frame * 1000 / 60);
        gaps.push(player.y - (platform.y + platform.height));
      }

      destroy();
      return gaps;
    });

    expect(gaps.every((gap) => Math.abs(gap) < 2)).toBe(true);
  });
}

const fixtureUrl = "/src/game/platforms/tests/moving-platform.ts";

async function createScene(page: Page, options: fixture.MovingPlatformOptions): Promise<JSHandle<fixture.MovingPlatformScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async ({ url, options }) => {
    const { createMovingPlatformScene } = await import(url) as typeof fixture;
    return createMovingPlatformScene(options);
  }, { url: fixtureUrl, options });
}
