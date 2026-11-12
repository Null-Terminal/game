import { expect, test } from "@playwright/test";

const fixtureUrl = "/src/utils/worker-pool/tests/fixture.ts";

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
