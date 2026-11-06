import { expect, test } from "@playwright/test";

import type * as rtreeScene from "../src/benchmarks/rtree-scene";
import { saveReport } from "./report";

test("insert, search, and remove R-tree entries", async ({ page }, testInfo) => {
  test.setTimeout(90_000);

  await page.goto("/tests/fixture.html");

  const module = await page.evaluateHandle(async (url) =>
    import(url) as Promise<typeof rtreeScene>,
  "/src/benchmarks/rtree-scene.ts");

  // Первый проход прогревает JIT и исключается из отчёта
  await module.evaluate(({ runRTreeBatch }) => runRTreeBatch());

  const session = await page.context().newCDPSession(page);
  await session.send("Profiler.enable");
  await session.send("Profiler.start");

  const runs: rtreeScene.RTreeTimes[] = [];

  for (let index = 0; index < 5; index++) {
    runs.push(await module.evaluate(({ runRTreeGroup }) => runRTreeGroup()));
  }

  const { profile } = await session.send("Profiler.stop");
  await session.send("Profiler.disable");

  expect(new Set(runs.map(({ checksum }) => checksum)).size).toBe(1);

  const version = await module.evaluate(({ RTREE_VERSION }) => RTREE_VERSION);
  const browser = page.context().browser()!.version();
  const report = await saveReport("rtree", version, browser, runs, profile);

  console.log(`R-tree benchmark: searchBest median ${report.median.searchBestMs.toFixed(2)} ms for four batches`);
  console.log(`Saved to benchmarks/results/${report.label}/rtree.json`);

  await testInfo.attach("R-tree summary", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json"
  });
});
