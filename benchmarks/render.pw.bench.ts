import { expect, test } from "@playwright/test";

import type * as scene from "../src/benchmarks/scene";
import { cpuRate, median, saveReport } from "./report";

interface FrameRun {
  frameCount: number;
  durationMs: number;
  fps: number;
  p50FrameMs: number;
  p95FrameMs: number;
  p50RenderMs: number;
  p95RenderMs: number;
  missedFramePercent: number;
  backgroundP50Ms: number;
  sceneP50Ms: number;
  interactP50Ms: number;
  mainP50Ms: number;
  overlayP50Ms: number;
  uiP50Ms: number;
  textureUploads: number;
  textureEvictions: number;
  textureBytes: number;
}

// Запуск: npm run bench:render
test("render the loaded demo scene", async ({ page }, testInfo) => {
  test.setTimeout(180_000);

  await page.goto("/tests/fixture.html");

  const viewport = page.viewportSize()!;
  const stress = process.env["BENCH_SCENE"] !== "demo";
  const skipped = process.env["BENCH_EXCLUDE"]?.split(",") ?? [];
  const excluded = (["sky", "fog", "flow", "background"] as const).filter((kind) => skipped.includes(kind));
  const renderScale = Number(process.env["BENCH_RENDER_SCALE"] ?? 1);
  const backend: "2d" | "webgl" = process.env["BENCH_RENDERER"] === "webgl" ? "webgl" : "2d";

  if (!Number.isFinite(renderScale) || renderScale <= 0 || renderScale > 1) {
    throw new RangeError("BENCH_RENDER_SCALE must be greater than 0 and at most 1");
  }

  const fixture = await page.evaluateHandle(async ({ url, viewport, stress, excluded, renderScale, backend }) => {
    const module = await import(url) as typeof scene;
    return module.createBenchmarkScene(viewport, stress, excluded, renderScale, backend);
  }, { url: "/src/benchmarks/scene.ts", viewport, stress, excluded, renderScale, backend });

  const setup = await fixture.evaluate(({ version, objectCount, viewport }) => ({
    version,
    objectCount,
    viewport
  }));
  const warmups = Number(process.env["BENCH_WARMUPS"] ?? 1);

  if (!Number.isInteger(warmups) || warmups < 1) {
    throw new RangeError("BENCH_WARMUPS must be a positive integer");
  }

  const environment = {
    browser: page.context().browser()!.version(),
    mode: testInfo.project.use.headless === false ? "headed" : "headless",
    cpuRate: cpuRate(),
    warmups,
    viewport
  } as const;

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: environment.cpuRate });

  // Прогреваем текстуры и кэши полными проходами по тому же маршруту
  for (let index = 0; index < warmups; index++) {
    await fixture.evaluate(async ({ runScan }) => {
      await runScan();
    });
  }

  await session.send("Profiler.enable");
  await session.send("Profiler.start");

  const runs: FrameRun[] = [];
  const initialTextures = await fixture.evaluate(({ game }) => game.canvas.textureStats);
  let previousUploads = initialTextures?.uploads ?? 0;
  let previousEvictions = initialTextures?.evictions ?? 0;

  for (let index = 0; index < 3; index++) {
    const { frameTimes, renderTimes, stageTimes, coverage, textureStats } = await fixture.evaluate(({ runScan }) => runScan());
    const total = frameTimes.reduce((sum, value) => sum + value, 0);

    expect(coverage).toEqual({
      roadEnd: true,
      middleLeft: true,
      middleRight: true,
      upperLeft: true,
      upperRight: true
    });

    runs.push({
      frameCount: frameTimes.length,
      durationMs: total,
      fps: frameTimes.length * 1000 / total,
      p50FrameMs: median(frameTimes),
      p95FrameMs: percentile(frameTimes, 0.95),
      p50RenderMs: median(renderTimes),
      p95RenderMs: percentile(renderTimes, 0.95),
      missedFramePercent: frameTimes.filter((value) => value > 25).length * 100 / frameTimes.length,
      backgroundP50Ms: median(stageTimes.background),
      sceneP50Ms: median(stageTimes.scene),
      interactP50Ms: median(stageTimes.interact),
      mainP50Ms: median(stageTimes.main),
      overlayP50Ms: median(stageTimes.overlay),
      uiP50Ms: median(stageTimes.ui),
      textureUploads: textureStats == null ? 0 : textureStats.uploads - previousUploads,
      textureEvictions: textureStats == null ? 0 : textureStats.evictions - previousEvictions,
      textureBytes: textureStats?.bytes ?? 0
    });

    previousUploads = textureStats?.uploads ?? 0;
    previousEvictions = textureStats?.evictions ?? 0;
  }

  const { profile } = await session.send("Profiler.stop");
  await session.send("Profiler.disable");

  await fixture.evaluate(({ destroy }) => destroy());

  const { width, height } = setup.viewport;
  const version = `${setup.version}:${setup.objectCount}-objects:${width}x${height}`;
  const report = await saveReport("render", version, environment, runs, profile);

  if (process.env["BENCH_SCREENSHOT"] === "1") {
    await page.screenshot({ path: `benchmarks/results/${report.label}/render.png` });
  }

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
