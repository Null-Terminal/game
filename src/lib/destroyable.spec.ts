import { describe, expect, it, vi } from "vitest";

import { Destroyable } from "#lib/destroyable";

class Resource extends Destroyable {}

describe("Destroyable", () => {
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

  it("disposes registered objects", () => {
    const resource = new Resource();
    const dispose = vi.fn();
    const subscription = { [Symbol.dispose]: dispose };

    expect(resource.onDestroy(subscription)).toBe(subscription);

    resource.destroy();
    resource.destroy();

    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("ignores null and undefined cleanups", () => {
    const resource = new Resource();

    expect(resource.onDestroy(null)).toBeNull();
    expect(resource.onDestroy(undefined)).toBeUndefined();
    expect(() => resource.destroy()).not.toThrow();
  });

  it("aborts the current signal when destroyed", () => {
    const resource = new Resource();
    const signal = resource.abortSignal;

    resource.destroy();

    expect(signal.aborted).toBe(true);
  });

  it("runs every destructor and combines their errors", () => {
    const resource = new Resource();
    const signal = resource.abortSignal;
    const calls: string[] = [];
    const first = new Error("first");
    const second = new Error("second");

    resource.onDestroy(() => {
      calls.push("first");
      throw first;
    });

    resource.onDestroy(() => {
      calls.push("second");
      throw second;
    });

    let caught: unknown;

    try {
      resource.destroy();

    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(AggregateError);
    expect(caught).toMatchObject({ errors: [second, first] });
    expect(calls).toEqual(["second", "first"]);
    expect(signal.aborted).toBe(true);
    expect(resource.destroyed).toBe(true);
  });

  it("preserves a single destructor error", () => {
    const resource = new Resource();
    const failure = new Error("failure");

    resource.onDestroy(() => {
      throw failure;
    });

    expect(() => resource.destroy()).toThrow(failure);
  });

});
