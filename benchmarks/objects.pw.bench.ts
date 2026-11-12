import { expect, test } from "@playwright/test";
import type { JSHandle } from "@playwright/test";

import type * as scene from "../src/benchmarks/object-count-scene";
import { cpuRate, median, saveReport } from "./report";

type ObjectScene = Awaited<ReturnType<typeof scene.createObjectCountScene>>;

interface ObjectRun {
  objectCount: number;
  frameCount: number;
  fps: number;
  p50FrameMs: number;
  p95FrameMs: number;
  p50RenderMs: number;
  p95RenderMs: number;
  textureBytes: number;
}

test("100 background objects versus one baked repeat", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.goto("/tests/fixture.html");

  const layout: "objects" | "baked" = process.env["BENCH_OBJECT_LAYOUT"] === "baked" ? "baked" : "objects";
  const backend: "2d" | "webgl" = process.env["BENCH_RENDERER"] === "webgl" ? "webgl" : "2d";
  const viewport = page.viewportSize()!;
  const warmups = Number(process.env["BENCH_WARMUPS"] ?? 2);

  if (!Number.isInteger(warmups) || warmups < 1) {
    throw new RangeError("BENCH_WARMUPS must be a positive integer");
  }

  const fixture: JSHandle<ObjectScene> = await page.evaluateHandle(async ({ url, viewport, layout, backend }) => {
    const module = await import(url) as typeof scene;
    return module.createObjectCountScene(viewport, layout, backend);
  }, { url: "/src/benchmarks/object-count-scene.ts", viewport, layout, backend });

  const { objectCount, version: sceneVersion } = await fixture.evaluate(({ objectCount, version }) => ({ objectCount, version }));
  expect(objectCount).toBe(layout === "objects" ? 100 : 1);

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

  const runs: ObjectRun[] = [];

  for (let index = 0; index < 3; index++) {
    const { frameTimes, renderTimes, textureStats } = await fixture.evaluate(({ runSample }) => runSample());
    const total = frameTimes.reduce((sum, value) => sum + value, 0);

    runs.push({
      objectCount,
      frameCount: frameTimes.length,
      fps: frameTimes.length * 1000 / total,
      p50FrameMs: median(frameTimes),
      p95FrameMs: percentile(frameTimes, 0.95),
      p50RenderMs: median(renderTimes),
      p95RenderMs: percentile(renderTimes, 0.95),
      textureBytes: textureStats?.bytes ?? 0
    });
  }

  const { profile } = await session.send("Profiler.stop");
  await session.send("Profiler.disable");

  const version = `${sceneVersion}:${backend}:${viewport.width}x${viewport.height}`;
  const report = await saveReport("objects", version, environment, runs, profile);

  if (process.env["BENCH_SCREENSHOT"] === "1") {
    await page.screenshot({ path: `benchmarks/results/${report.label}/objects.png` });
  }

  await fixture.evaluate(({ destroy }) => destroy());

  console.log(`${layout}: ${report.median.fps.toFixed(1)} FPS, render p50 ${report.median.p50RenderMs.toFixed(2)} ms`);
  console.log(`Saved to benchmarks/results/${report.label}/objects.json`);
});

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(fraction * sorted.length) - 1;
  return sorted[index]!;
}
