import { describe, expect, it } from "vitest";

import { EventEmitter, handler } from "#/event-emitter";

describe("EventEmitter", () => {
  it("removes an unordered listener by moving the last one into its place", () => {
    const emitter = new EventEmitter({ frame: handler<void>() });
    const calls: string[] = [];

    emitter.events.frame.on(() => calls.push("first"));
    const middle = emitter.events.frame.on(() => calls.push("middle"));
    emitter.events.frame.on(() => calls.push("last"));

    middle.dispose();
    emitter.events.frame.emit();

    expect(calls).toEqual(["first", "last"]);
  });

  it("keeps an ordered listener in place while it sleeps", () => {
    const emitter = new EventEmitter({ frame: handler<void>({ ordered: true }) });
    const calls: string[] = [];

    emitter.events.frame.on(() => calls.push("first"));
    const middle = emitter.events.frame.on(() => calls.push("middle"));
    emitter.events.frame.on(() => calls.push("last"));

    middle.sleep();
    emitter.events.frame.emit();

    middle.wake();
    emitter.events.frame.emit();

    expect(calls).toEqual(["first", "last", "first", "middle", "last"]);
  });

  it("removes a one-time listener without skipping the next listener", () => {
    const emitter = new EventEmitter({ frame: handler<void>() });
    const calls: string[] = [];

    emitter.events.frame.once(() => calls.push("once"));
    emitter.events.frame.on(() => calls.push("later"));

    emitter.events.frame.emit();
    emitter.events.frame.emit();

    expect(calls).toEqual(["once", "later", "later"]);
  });

  it("binds flush subscriptions and clears them with the emitter", () => {
    const emitter = new EventEmitter({ frame: handler<void>({ ordered: true, withFlush: true }) });
    const calls: string[] = [];

    emitter.events.frame.on(() => calls.push("frame"));
    emitter.events.frame.flush!.on(() => calls.push("flush"));

    emitter.events.frame.emit();
    emitter.events.frame.flush!.emit();
    emitter.off();
    emitter.events.frame.emit();

    expect(calls).toEqual(["frame", "flush", "flush"]);
  });

  it("disposes a subscription at the end of a using scope", () => {
    const emitter = new EventEmitter({ frame: handler<void>() });
    let calls = 0;

    {
      using subscription = emitter.events.frame.on(() => calls++);
      emitter.events.frame.emit();
      expect(calls).toBe(1);
      expect(subscription[Symbol.dispose]).toBe(subscription.dispose);
    }

    emitter.events.frame.emit();
    expect(calls).toBe(1);
  });
});
