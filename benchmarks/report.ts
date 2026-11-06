/// <reference types="node" />

import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus } from "node:os";
import { join } from "node:path";
import { arch, env, platform } from "node:process";

export interface BenchmarkReport<T> {
  scenario: "render" | "rtree";
  version: string;
  label: string;
  revision: string;
  dirty: boolean;
  browser: string;
  machine: string;
  createdAt: string;
  runs: T[];
  median: Omit<T, "checksum">;
}

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

export async function saveReport<T extends object>(
  scenario: BenchmarkReport<T>["scenario"],
  version: string,
  browser: string,
  runs: T[],
  profile: unknown
): Promise<BenchmarkReport<T>> {
  const label = env["BENCH_LABEL"] ?? "local";

  if (!/^[\w.-]+$/.test(label)) {
    throw new Error("BENCH_LABEL may contain only letters, digits, dots, underscores, and hyphens");
  }

  const revision = git("rev-parse", "HEAD");
  const dirty = git("status", "--porcelain").length > 0;

  const keys = Object.keys(runs[0]!).filter((key) => key !== "checksum") as (keyof T)[];
  const summary = Object.fromEntries(keys.map((key) => [
    key,
    median(runs.map((run) => run[key] as number))
  ])) as Omit<T, "checksum">;

  const report: BenchmarkReport<T> = {
    scenario,
    version,
    label,
    revision,
    dirty,
    browser,
    machine: `${platform}-${arch}: ${cpus()[0]?.model ?? "unknown CPU"}`,
    createdAt: new Date().toISOString(),
    runs,
    median: summary
  };

  const directory = join("benchmarks", "results", label);
  await mkdir(directory, { recursive: true });

  await Promise.all([
    writeFile(join(directory, `${scenario}.json`), JSON.stringify(report, null, 2)),
    writeFile(join(directory, `${scenario}.cpuprofile`), JSON.stringify(profile))
  ]);

  return report;
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}
