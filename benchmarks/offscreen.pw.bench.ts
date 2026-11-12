import { expect, test } from "@playwright/test";
import type { JSHandle } from "@playwright/test";

import type * as scene from "../src/benchmarks/offscreen-scene";
import { cpuRate, median, saveReport } from "./report";

type OffscreenScene = Awaited<ReturnType<typeof scene.createOffscreenScene>>;

interface OffscreenRun {
  objectCount: number;
  awakeCount: number;
  frameCount: number;
  fps: number;
  p50FrameMs: number;
  p95FrameMs: number;
  p50RenderMs: number;
  p95RenderMs: number;
}

test("offscreen dynamic objects in each status", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.goto("/tests/fixture.html");

  const requestedMode = process.env["BENCH_OFFSCREEN_MODE"];
  const mode: scene.OffscreenMode = requestedMode === "paused" || requestedMode === "sleep" ||
    requestedMode === "culled" || requestedMode === "absent" ?
    requestedMode : "active";
  const kind: scene.OffscreenObjectKind = process.env["BENCH_OBJECT_KIND"] === "collider" ? "collider" : "plain";
  const layout: scene.OffscreenLayout = process.env["BENCH_OFFSCREEN_LAYOUT"] === "spread" ? "spread" : "far";
  const count = Number(process.env["BENCH_OFFSCREEN_COUNT"] ?? 500);
  const warmups = Number(process.env["BENCH_WARMUPS"] ?? 2);
  const viewport = page.viewportSize()!;

  if (!Number.isInteger(count) || count < 1 || count > 5000) {
    throw new RangeError("BENCH_OFFSCREEN_COUNT must be an integer between 1 and 5000");
  }

  if (!Number.isInteger(warmups) || warmups < 1) {
    throw new RangeError("BENCH_WARMUPS must be a positive integer");
  }

  const fixture: JSHandle<OffscreenScene> = await page.evaluateHandle(async ({ url, viewport, mode, count, kind, layout }) => {
    const module = await import(url) as typeof scene;
    return module.createOffscreenScene(viewport, mode, count, kind, layout);
  }, { url: "/src/benchmarks/offscreen-scene.ts", viewport, mode, count, kind, layout });

  const setup = await fixture.evaluate(({ version, objectCount }) => ({ version, objectCount }));
  expect(setup.objectCount).toBe(mode === "absent" ? 0 : count);

  const environment = {
    browser: page.context().browser()!.version(),
    mode: testInfo.project.use.headless === false ? "headed" : "headless",
    cpuRate: cpuRate(),
    warmups,
    viewport
  } as const;

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: environment.cpuRate });

  for (let index = 0; index < warmups; index++) {
    await fixture.evaluate(({ runSample }) => runSample());
  }

  await session.send("Profiler.enable");
  await session.send("Profiler.start");

  const runs: OffscreenRun[] = [];

  for (let index = 0; index < 3; index++) {
    const { frameTimes, renderTimes, awakeCount, targetX } = await fixture.evaluate(({ runSample }) => runSample());
    const total = frameTimes.reduce((sum, value) => sum + value, 0);

    if (layout === "spread") {
      expect(targetX).toBeGreaterThan(viewport.width * 9);
    }

    runs.push({
      objectCount: setup.objectCount,
      awakeCount,
      frameCount: frameTimes.length,
      fps: frameTimes.length * 1000 / total,
      p50FrameMs: median(frameTimes),
      p95FrameMs: percentile(frameTimes, 0.95),
      p50RenderMs: median(renderTimes),
      p95RenderMs: percentile(renderTimes, 0.95)
    });
  }

  const { profile } = await session.send("Profiler.stop");
  await session.send("Profiler.disable");

  const version = `${setup.version}:${count}:${viewport.width}x${viewport.height}`;
  const report = await saveReport("offscreen", version, environment, runs, profile);
  await fixture.evaluate(({ destroy }) => destroy());

  console.log(`${kind} ${layout} ${mode}: ${report.median.fps.toFixed(1)} FPS, ${report.median.awakeCount} awake`);
  console.log(`Saved to benchmarks/results/${report.label}/offscreen.json`);
});

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(fraction * sorted.length) - 1;
  return sorted[index]!;
}
