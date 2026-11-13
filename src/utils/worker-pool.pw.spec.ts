import { expect, test } from "@playwright/test";

const fixtureUrl = "/src/utils/worker-pool/tests/fixture.ts";
const idleFixtureUrl = "/src/utils/worker-pool/tests/idle-fixture.ts";

test("reuses an idle worker and creates another for concurrent tasks", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const fixture = await import(url);
    return fixture.reuseWorker();
  }, fixtureUrl);

  expect(result).toEqual({ created: 2, values: [1, 2, 3, 4] });
});

test("replaces an idle worker when a different class needs the only slot", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const fixture = await import(url);
    return fixture.reuseByClass();
  }, fixtureUrl);

  expect(result).toEqual({ firstCreated: 2, secondCreated: 1, values: [1, 2, 3] });
});

test("transfers buffers and reuses a worker after a rejected task", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const fixture = await import(url);
    return fixture.transferAndRecover();
  }, fixtureUrl);

  expect(result).toEqual({ size: 16, detachedSize: 0, error: "Requested failure", afterFailure: 7 });
});

test("never creates more workers than the reported hardware concurrency", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const fixture = await import(url);
    return fixture.limitByHardwareConcurrency();
  }, fixtureUrl);

  expect(result).toEqual({ created: 1, values: [1, 2, 3] });
});

test("retires an idle worker and creates a new one for a later task", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const fixture = await import(url);
    return fixture.retireIdleWorker();
  }, idleFixtureUrl);

  expect(result).toEqual({
    values: [1, 2, 3],
    reusedBeforeTimeout: true,
    retiredAfterTimeout: true,
    created: 2
  });
});

test("keeps an idle worker when its pool has no timeout", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const fixture = await import(url);
    return fixture.keepIdleWorkerWithoutTimeout();
  }, idleFixtureUrl);

  expect(result).toEqual({
    values: [1, 2],
    aliveWhileIdle: true,
    created: 1,
    terminated: 1
  });
});

test("keeps a busy worker alive and retires it after its queue finishes", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const fixture = await import(url);
    return fixture.keepBusyWorker();
  }, idleFixtureUrl);

  expect(result).toEqual({
    values: [1, 2],
    aliveWhileBusy: true,
    reusedForQueuedJob: true,
    retiredAfterQueue: true
  });
});

test("keeps a transferred bitmap usable after its worker retires", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const fixture = await import(url);
    return fixture.useTransferredBitmapAfterRetirement();
  }, idleFixtureUrl);

  expect(result).toEqual({ terminated: 1, pixel: [255, 0, 0, 255], webglPixel: [255, 0, 0, 255] });
});

test("keeps a loaded game sprite usable while its worker stays alive", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const fixture = await import(url);
    return fixture.useRealSpriteWithPersistentWorker();
  }, idleFixtureUrl);

  expect(result.before).toBeGreaterThan(0);
  expect(result.after).toBe(result.before);
  expect(page.workers()).toHaveLength(1);
});
