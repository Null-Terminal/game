/// <reference types="node" />

import { env } from "node:process";

import { defineConfig } from "@playwright/test";

function dimension(name: string, fallback: number): number {
  const value = Number(env[name] ?? fallback);

  if (!Number.isInteger(value) || value <= 0 || value > 8192) {
    throw new RangeError(`${name} must be an integer between 1 and 8192`);
  }

  return value;
}

const port = dimension("BENCH_PORT", 5173);

export default defineConfig({
  testDir: "./benchmarks",
  testMatch: "*.pw.bench.ts",
  workers: 1,
  retries: 0,
  reporter: "list",

  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: "chromium",
    viewport: {
      width: dimension("BENCH_WIDTH", 1280),
      height: dimension("BENCH_HEIGHT", 720)
    },
    trace: "off"
  },

  webServer: {
    command: `npm run dev:game -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/tests/fixture.html`,
    reuseExistingServer: false,
    timeout: 120_000
  }
});
