import type { EventOptions, Handler, Subscription } from "#/event-emitter/types";

interface HandlerBox<P> {
  handler: Handler<P>;
  ptr: number;
  sleeping: boolean;
}

export class EventChannel<P> {
  readonly flush?: EventChannel<P>;

  readonly #store: HandlerBox<P>[] | Set<HandlerBox<P>>;

  get size() {
    return this.#store instanceof Set ? this.#store.size : this.#store.length;
  }

  constructor(opts: EventOptions = {}) {
    this.#store = opts.ordered ? new Set() : [];

    if (opts.withFlush) {
      this.flush = new EventChannel<P>({ ordered: opts.ordered === true });
    }
  }

  on(handler: Handler<P>): Subscription {
    const box: HandlerBox<P> = { handler, ptr: -1, sleeping: false };
    const store = this.#store;

    if (store instanceof Set) {
      store.add(box);

    } else {
      box.ptr = store.length;
      store.push(box);
    }

    let disposed = false;

    const dispose = () => {
      if (disposed) {
        return;
      }

      disposed = true;
      this.#remove(box);
    };

    return {
      sleep: () => {
        box.sleeping = true;
      },

      wake: () => {
        box.sleeping = false;
      },

      dispose,
      [Symbol.dispose]: dispose
    };
  }

  once(handler: Handler<P>): Subscription {
    const subscription = this.on((payload) => {
      subscription.dispose();
      handler(payload);
    });

    return subscription;
  }

  emit(payload: P): void;
  emit(...payload: P extends void ? [] : never): void;
  emit(payload?: P) {
    this.#dispatch(payload as P);
  }

  off() {
    const store = this.#store;

    if (store instanceof Set) {
      store.clear();

    } else {
      store.length = 0;
    }

    this.flush?.off();
  }

  #dispatch(value: P) {
    const store = this.#store;

    if (store instanceof Set) {
      for (const box of store) {
        if (!box.sleeping) {
          box.handler(value);
        }
      }

    } else {
      for (let index = 0; index < store.length;) {
        const box = store[index]!;

        if (!box.sleeping) {
          box.handler(value);
        }

        index = store[box.ptr] === box ? box.ptr + 1 : index;
      }
    }

    if (this.flush != null) {
      this.flush.#dispatch(value);
    }
  }

  #remove(box: HandlerBox<P>) {
    const store = this.#store;

    if (store instanceof Set) {
      store.delete(box);
      return;
    }

    const { ptr } = box;

    if (store[ptr] !== box) {
      return;
    }

    const last = store.pop()!;

    if (last !== box) {
      store[ptr] = last;
      last.ptr = ptr;
    }

    box.ptr = -1;
  }
}

export function handler<P>(opts?: EventOptions): EventChannel<P> {
  return new EventChannel<P>(opts);
}
