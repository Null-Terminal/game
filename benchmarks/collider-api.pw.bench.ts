import { expect, test } from "@playwright/test";

import type * as colliderScene from "../src/benchmarks/collider-api-scene";
import { cpuRate, saveReport } from "./report";

test("per-frame collision rebuild versus stationary collider switching", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto("/tests/fixture.html");

  const module = await page.evaluateHandle(async (url) =>
    import(url) as Promise<typeof colliderScene>,
  "/src/benchmarks/collider-api-scene.ts");

  const movingCount = Number(process.env["BENCH_MOVING_COUNT"] ?? 100);
  const environment = {
    browser: page.context().browser()!.version(),
    mode: testInfo.project.use.headless === false ? "headed" : "headless",
    cpuRate: cpuRate(),
    warmups: 1,
    viewport: page.viewportSize()!
  } as const;

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: environment.cpuRate });

  await module.evaluate(({ compareColliderApis }, count) => compareColliderApis(count), movingCount);

  await session.send("Profiler.enable");
  await session.send("Profiler.start");

  const runs: colliderScene.ColliderApiTimes[] = [];

  for (let index = 0; index < 5; index++) {
    runs.push(await module.evaluate(({ compareColliderApis }, input) =>
      compareColliderApis(input.count, input.reverse),
    { count: movingCount, reverse: index % 2 === 1 }));
  }

  const { profile } = await session.send("Profiler.stop");
  await session.send("Profiler.disable");

  expect(new Set(runs.map(({ checksum }) => checksum)).size).toBe(1);

  const version = await module.evaluate(({ COLLIDER_API_VERSION }) => COLLIDER_API_VERSION);
  const report = await saveReport("collider-api", `${version}:${movingCount}`, environment, runs, profile);

  console.log(`${movingCount} moving: update ${report.median.updateBaselineMs.toFixed(1)} → ${report.median.updateSwitchingMs.toFixed(1)} ms`);
  console.log(`Saved to benchmarks/results/${report.label}/collider-api.json`);
});
