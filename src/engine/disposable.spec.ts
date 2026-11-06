import { describe, expect, it, vi } from "vitest";

import { Disposable } from "#engine/disposable";

class Resource extends Disposable {}

describe("Disposable", () => {
  it("runs destructors in reverse registration order only once", () => {
    const resource = new Resource();
    const order: string[] = [];

    resource.onDestroy(() => order.push("first"));
    resource.onDestroy(() => order.push("second"));

    resource.destroy();
    resource.destroy();

    expect(order).toEqual(["second", "first"]);
    expect(resource.destroyed).toBe(true);
  });

  it("aborts the current signal when destroyed", () => {
    const resource = new Resource();
    const signal = resource.abortSignal;

    resource.destroy();

    expect(signal.aborted).toBe(true);
  });

  it("runs a next-tick callback unless the resource was destroyed first", async () => {
    const live = new Resource();
    const destroyed = new Resource();
    const callback = vi.fn();

    live.nextTick(callback);
    destroyed.nextTick(callback);
    destroyed.destroy();

    await Promise.resolve();

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
