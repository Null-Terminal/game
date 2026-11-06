import { readFile } from "node:fs/promises";
import { join } from "node:path";

const [baselineLabel, currentLabel] = process.argv.slice(2);
const metrics = {
  render: ["fps", "p95FrameMs", "p50RenderMs", "p95RenderMs", "missedFramePercent"],
  rtree: ["insertMs", "searchFirstMs", "searchBestMs", "removeMs"]
};

if (!baselineLabel || !currentLabel) {
  console.error("Usage: node benchmarks/compare.mjs <baseline-label> <current-label>");
  process.exitCode = 1;

} else {
  for (const scenario of ["render", "rtree"]) {
    const baseline = await readReport(baselineLabel, scenario);
    const current = await readReport(currentLabel, scenario);

    if (
      baseline.version !== current.version ||
      baseline.browser !== current.browser ||
      baseline.machine !== current.machine
    ) {
      console.error(`${scenario}: scene, browser, or machine differs; results are not comparable`);
      process.exitCode = 1;
      continue;
    }

    console.log(`\n${scenario} (${baseline.version}, Chromium ${baseline.browser})`);
    console.log(`  ${baseline.label}: ${baseline.revision.slice(0, 8)}${baseline.dirty ? " (dirty)" : ""}`);
    console.log(`  ${current.label}: ${current.revision.slice(0, 8)}${current.dirty ? " (dirty)" : ""}`);

    for (const metric of metrics[scenario]) {
      const before = baseline.median[metric];
      const after = current.median[metric];

      if (typeof before !== "number" || typeof after !== "number") {
        continue;
      }

      const change = before === 0 ? "n/a" : `${((after - before) / before * 100).toFixed(1)}%`;
      const beforeValues = baseline.runs.map((run) => run[metric]);
      const afterValues = current.runs.map((run) => run[metric]);

      const overlap = Math.min(...beforeValues) <= Math.max(...afterValues) &&
        Math.min(...afterValues) <= Math.max(...beforeValues);

      const note = overlap ? " (run ranges overlap)" : "";

      console.log(`  ${metric.padEnd(18)} ${before.toFixed(2).padStart(9)} → ${after.toFixed(2).padStart(9)}  ${change}${note}`);
    }
  }
}

async function readReport(label, scenario) {
  if (!/^[\w.-]+$/.test(label)) {
    throw new Error(`Invalid label: ${label}`);
  }

  const path = join("benchmarks", "results", label, `${scenario}.json`);
  return JSON.parse(await readFile(path, "utf8"));
}
