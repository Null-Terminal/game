import { test } from "@playwright/test";

import type * as scene from "../src/benchmarks/scene";
import { median, saveReport } from "./report";

interface FrameRun {
  frameCount: number;
  durationMs: number;
  fps: number;
  p50FrameMs: number;
  p95FrameMs: number;
  p50RenderMs: number;
  p95RenderMs: number;
  missedFramePercent: number;
}

// Запуск: npm run bench:render
test("render the loaded demo stress scene", async ({ page }, testInfo) => {
  test.setTimeout(90_000);

  await page.goto("/tests/fixture.html");

  const fixture = await page.evaluateHandle(async (url) => {
    const module = await import(url) as typeof scene;
    return module.createBenchmarkScene();
  }, "/src/benchmarks/scene.ts");

  const setup = await fixture.evaluate(({ version, objectCount, viewport }) => ({
    version,
    objectCount,
    viewport
  }));
  const browser = page.context().browser()!.version();

  // Прогреваем импортированные текстуры, кэши кадров и JIT до измерения
  await page.waitForTimeout(2000);

  const session = await page.context().newCDPSession(page);
  await session.send("Profiler.enable");
  await session.send("Profiler.start");

  const runs: FrameRun[] = [];

  for (let index = 0; index < 3; index++) {
    await fixture.evaluate(({ beginSample }) => beginSample());

    const frameTimes = await page.evaluate(() => new Promise<number[]>((resolve) => {
      const times: number[] = [];
      let started = 0;
      let previous = 0;

      function sample(now: number) {
        if (started === 0) {
          started = now;
        }

        if (previous !== 0) {
          times.push(now - previous);
        }

        previous = now;

        if (now - started < 3000) {
          requestAnimationFrame(sample);

        } else {
          resolve(times);
        }
      }

      requestAnimationFrame(sample);
    }));

    const renderTimes = await fixture.evaluate(({ endSample }) => endSample());
    const total = frameTimes.reduce((sum, value) => sum + value, 0);

    runs.push({
      frameCount: frameTimes.length,
      durationMs: total,
      fps: frameTimes.length * 1000 / total,
      p50FrameMs: median(frameTimes),
      p95FrameMs: percentile(frameTimes, 0.95),
      p50RenderMs: median(renderTimes),
      p95RenderMs: percentile(renderTimes, 0.95),
      missedFramePercent: frameTimes.filter((value) => value > 25).length * 100 / frameTimes.length
    });
  }

  const { profile } = await session.send("Profiler.stop");
  await session.send("Profiler.disable");

  await fixture.evaluate(({ destroy }) => destroy());

  const { width, height } = setup.viewport;
  const version = `${setup.version}:${setup.objectCount}-objects:${width}x${height}`;
  const report = await saveReport("render", version, browser, runs, profile);

  console.log(`Render benchmark: ${report.median.fps.toFixed(1)} FPS, p95 render ${report.median.p95RenderMs.toFixed(2)} ms`);
  console.log(`Saved to benchmarks/results/${report.label}/render.json`);

  await testInfo.attach("render summary", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json"
  });
});

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(fraction * sorted.length) - 1;
  return sorted[Math.max(0, index)]!;
}
