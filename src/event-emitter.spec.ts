import { describe, expect, it } from "vitest";

import { EventEmitter, handler } from "#/event-emitter";

describe("EventEmitter", () => {
  it("removes an unordered listener by moving the last one into its place", () => {
    const emitter = new EventEmitter({ frame: handler<void>() });
    const calls: string[] = [];

    emitter.on(emitter.events.frame, () => calls.push("first"));
    const middle = emitter.on(emitter.events.frame, () => calls.push("middle"));
    emitter.on(emitter.events.frame, () => calls.push("last"));

    middle.dispose();
    emitter.emit(emitter.events.frame, undefined);

    expect(calls).toEqual(["first", "last"]);
  });

  it("keeps an ordered listener in place while it sleeps", () => {
    const emitter = new EventEmitter({ frame: handler<void>({ ordered: true }) });
    const calls: string[] = [];

    emitter.on(emitter.events.frame, () => calls.push("first"));
    const middle = emitter.on(emitter.events.frame, () => calls.push("middle"));
    emitter.on(emitter.events.frame, () => calls.push("last"));

    middle.sleep();
    emitter.emit(emitter.events.frame, undefined);

    middle.wake();
    emitter.emit(emitter.events.frame, undefined);

    expect(calls).toEqual(["first", "last", "first", "middle", "last"]);
  });

  it("removes a one-time listener without skipping the next listener", () => {
    const emitter = new EventEmitter({ frame: handler<void>() });
    const calls: string[] = [];

    emitter.once(emitter.events.frame, () => calls.push("once"));
    emitter.on(emitter.events.frame, () => calls.push("later"));

    emitter.emit(emitter.events.frame, undefined);
    emitter.emit(emitter.events.frame, undefined);

    expect(calls).toEqual(["once", "later", "later"]);
  });
});
