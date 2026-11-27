import type { JSHandle, Page } from "@playwright/test";

import type * as fixture from "#game/tests/fixture";

const fixtureUrl = "/src/game/tests/fixture.ts";

export async function createInteractionScene(page: Page): Promise<JSHandle<fixture.InteractionScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async (url) => {
    const { createInteractionScene } = await import(url) as typeof fixture;
    return createInteractionScene();
  }, fixtureUrl);
}
