/// <reference types="node" />

import { readFile } from "node:fs/promises";
import { join } from "node:path";

type Scenario = "render" | "rtree" | "objects" | "offscreen" | "collision-index" | "collider-api";

interface Report {
  version: string;
  browser: string;
  mode: "headed" | "headless";
  cpuRate: number;
  warmups: number;
  viewport: { width: number; height: number };
  machine: string;
  label: string;
  revision: string;
  dirty: boolean;
  median: Record<string, number>;
  runs: Record<string, number>[];
}

const [baselineLabel, currentLabel, selectedScenario] = process.argv.slice(2);
const metrics: Record<Scenario, readonly string[]> = {
  render: ["fps", "p95FrameMs", "p50RenderMs", "p95RenderMs", "missedFramePercent"],
  rtree: ["insertMs", "searchFirstMs", "searchBestMs", "removeMs"],
  objects: ["fps", "p50FrameMs", "p95FrameMs", "p50RenderMs", "p95RenderMs", "textureBytes"],
  offscreen: ["awakeCount", "fps", "p50FrameMs", "p95FrameMs", "p50RenderMs", "p95RenderMs"],
  "collision-index": ["staticSetupMs", "transitionMs", "rebuildAllMs", "queryAllMs", "rebuildSplitMs", "querySplitMs"],
  "collider-api": ["setupBaselineMs", "setupSwitchingMs", "updateBaselineMs", "updateSwitchingMs", "queryBaselineMs", "querySwitchingMs"]
};

if (selectedScenario != null && !(selectedScenario in metrics)) {
  throw new Error(`Неизвестный сценарий: ${selectedScenario}`);
}

if (!baselineLabel || !currentLabel) {
  console.error("Использование: node benchmarks/compare.ts <базовый-прогон> <новый-прогон> [render|rtree|objects|offscreen|collision-index|collider-api]");
  process.exitCode = 1;

} else {
  const scenarios: readonly Scenario[] = selectedScenario == null ? ["render", "rtree"] : [selectedScenario as Scenario];

  for (const scenario of scenarios) {
    const baseline = await readReport(baselineLabel, scenario);
    const current = await readReport(currentLabel, scenario);

    if (
      baseline.version !== current.version ||
      baseline.browser !== current.browser ||
      baseline.machine !== current.machine ||
      baseline.mode == null || baseline.mode !== current.mode ||
      baseline.cpuRate == null || baseline.cpuRate !== current.cpuRate ||
      baseline.warmups == null || baseline.warmups !== current.warmups ||
      baseline.viewport == null ||
      baseline.viewport.width !== current.viewport?.width ||
      baseline.viewport.height !== current.viewport?.height
    ) {
      console.error(`${scenario}: различаются сценарий, браузер, режим запуска, разрешение, CPU throttle или компьютер`);
      process.exitCode = 1;
      continue;
    }

    console.log(`\n${scenario} (${baseline.version}, Chromium ${baseline.browser}, ${baseline.mode}, CPU x${baseline.cpuRate})`);
    console.log(`  ${baseline.label}: ${baseline.revision.slice(0, 8)}${baseline.dirty ? " (есть незакоммиченные изменения)" : ""}`);
    console.log(`  ${current.label}: ${current.revision.slice(0, 8)}${current.dirty ? " (есть незакоммиченные изменения)" : ""}`);

    for (const metric of metrics[scenario]) {
      const before = baseline.median[metric];
      const after = current.median[metric];

      if (typeof before !== "number" || typeof after !== "number") {
        continue;
      }

      const change = before === 0 ? "не определено" : `${((after - before) / before * 100).toFixed(1)}%`;
      const beforeValues = baseline.runs.map((run) => run[metric]!);
      const afterValues = current.runs.map((run) => run[metric]!);

      const overlap = Math.min(...beforeValues) <= Math.max(...afterValues) &&
        Math.min(...afterValues) <= Math.max(...beforeValues);

      const note = overlap ? " (диапазоны замеров пересекаются)" : "";

      console.log(`  ${metric.padEnd(18)} ${before.toFixed(2).padStart(9)} → ${after.toFixed(2).padStart(9)}  ${change}${note}`);
    }
  }
}

async function readReport(label: string, scenario: Scenario): Promise<Report> {
  if (!/^[\w.-]+$/.test(label)) {
    throw new Error(`Некорректная метка замера: ${label}`);
  }

  const path = join("benchmarks", "results", label, `${scenario}.json`);
  return JSON.parse(await readFile(path, "utf8"));
}
