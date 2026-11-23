import { expect, test } from "@playwright/test";

test("storage keeps collections separate", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async () => {
    const modulePath = "/src/storage.ts";
    const { IndexedDBStorage } = await import(modulePath);
    const storage = new IndexedDBStorage(`storage-test-${crypto.randomUUID()}`, 1, ["first", "second"]);

    await storage.put("first", "game", { volume: 0.5 });
    await storage.put("second", "slot-1", { level: "street" });

    const first = await storage.get("first", "game");
    const second = await storage.get("second", "slot-1");
    const secondKeys = await storage.getAllKeys("second");

    await storage.delete("second", "slot-1");

    const deleted = await storage.get("second", "slot-1");
    storage[Symbol.dispose]();

    const rejected = await storage.get("first", "game").then(
      () => false,
      () => true
    );

    return {
      first,
      second,
      secondKeys,
      deleted,
      destroyed: storage.destroyed,
      rejected
    };
  });

  expect(result).toEqual({
    first: { volume: 0.5 },
    second: { level: "street" },
    secondKeys: ["slot-1"],
    deleted: undefined,
    destroyed: true,
    rejected: true
  });
});

test("disposing while opening prevents further operations", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const rejected = await page.evaluate(async () => {
    const modulePath = "/src/storage.ts";
    const { IndexedDBStorage } = await import(modulePath);
    const storage = new IndexedDBStorage(`storage-test-${crypto.randomUUID()}`, 1, ["items"]);
    const opening = storage.get("items", "first");

    storage[Symbol.dispose]();

    return opening.then(
      () => false,
      () => true
    );
  });

  expect(rejected).toBe(true);
});
