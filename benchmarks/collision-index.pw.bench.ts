import { expect, test } from "@playwright/test";

import type * as collisionScene from "../src/benchmarks/collision-index-scene";
import { cpuRate, saveReport } from "./report";

test("rebuild all dynamic collisions or retain stationary entries", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto("/tests/fixture.html");

  const module = await page.evaluateHandle(async (url) =>
    import(url) as Promise<typeof collisionScene>,
  "/src/benchmarks/collision-index-scene.ts");

  const movingCount = Number(process.env["BENCH_MOVING_COUNT"] ?? 100);
  const swapsPerFrame = Number(process.env["BENCH_SWAPS_PER_FRAME"] ?? 0);

  if (![0, 100, 500].includes(movingCount)) {
    throw new RangeError("BENCH_MOVING_COUNT must be 0, 100, or 500");
  }

  if (!Number.isInteger(swapsPerFrame) || swapsPerFrame < 0 ||
    swapsPerFrame > Math.min(movingCount, 500 - movingCount)) {
    throw new RangeError("BENCH_SWAPS_PER_FRAME exceeds the moving or stationary count");
  }

  const environment = {
    browser: page.context().browser()!.version(),
    mode: testInfo.project.use.headless === false ? "headed" : "headless",
    cpuRate: cpuRate(),
    warmups: 1,
    viewport: page.viewportSize()!
  } as const;

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: environment.cpuRate });

  const input = { movingCount, swapsPerFrame };

  await module.evaluate(({ compareCollisionIndexes }, { movingCount, swapsPerFrame }) =>
    compareCollisionIndexes(movingCount, swapsPerFrame), input);

  await session.send("Profiler.enable");
  await session.send("Profiler.start");

  const runs: collisionScene.CollisionIndexTimes[] = [];

  for (let index = 0; index < 5; index++) {
    runs.push(await module.evaluate(({ compareCollisionIndexes }, { movingCount, swapsPerFrame }) =>
      compareCollisionIndexes(movingCount, swapsPerFrame), input));
  }

  const { profile } = await session.send("Profiler.stop");
  await session.send("Profiler.disable");

  expect(new Set(runs.map(({ checksum }) => checksum)).size).toBe(1);

  const version = await module.evaluate(({ COLLISION_INDEX_VERSION }) => COLLISION_INDEX_VERSION);
  const report = await saveReport("collision-index", `${version}:${movingCount}:${swapsPerFrame}`, environment, runs, profile);

  console.log(`${movingCount} moving: rebuild ${report.median.rebuildAllMs.toFixed(1)} → ${report.median.rebuildSplitMs.toFixed(1)} ms`);
  console.log(`Saved to benchmarks/results/${report.label}/collision-index.json`);
});
