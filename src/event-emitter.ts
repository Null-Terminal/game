export type Handler<T = any> = (payload: T) => void;

interface HandlerBox {
  handler: Handler;
  ptr: number;
  sleeping: boolean;
}

interface HandlerMetadata<P> {
  PayloadType: P;
  flush?: Handlers<P>;
}

export type ArrayHandlers<P = any> = HandlerBox[] & HandlerMetadata<P>;
export type OrderedHandlers<P = any> = Set<HandlerBox> & HandlerMetadata<P>;
export type Handlers<P = any> = ArrayHandlers<P> | OrderedHandlers<P>;

export interface Subscription {
  sleep(): void;
  wake(): void;
  dispose(): void;
}

export interface HandlerOptions {
  // Добавляет событие .flush, вызываемое после основного
  withFlush?: boolean;

  // Сохраняет порядок подписчиков при удалении
  ordered?: boolean;
}

export function handler<P>(opts: HandlerOptions & { ordered: true }): OrderedHandlers<P>;
export function handler<P>(opts?: HandlerOptions & { ordered?: false }): ArrayHandlers<P>;
export function handler<P>(opts?: HandlerOptions): Handlers<P> {
  const event = (opts?.ordered ? new Set<HandlerBox>() : []) as Handlers<P>;

  if (opts?.withFlush) {
    event.flush = opts.ordered ? handler<P>({ ordered: true }) : handler<P>();
  }

  return event;
}

export class EventEmitter<T extends Record<string, Handlers>> {
  readonly events: Readonly<T>;

  #values: Handlers[] | null = null;

  constructor(events: T) {
    this.events = events;
  }

  on<E extends Handlers>(event: E, handler: Handler<E["PayloadType"]>): Subscription {
    const box: HandlerBox = { handler, ptr: -1, sleeping: false };

    if (event instanceof Set) {
      event.add(box);

    } else {
      box.ptr = event.length;
      event.push(box);
    }

    let disposed = false;

    return {
      sleep: () => {
        box.sleeping = true;
      },

      wake: () => {
        box.sleeping = false;
      },

      dispose: () => {
        if (disposed) {
          return;
        }

        disposed = true;
        this.#remove(event, box);
      }
    };
  }

  once<E extends Handlers>(event: E, handler: Handler<E["PayloadType"]>): Subscription {
    const subscription = this.on(event, (payload) => {
      subscription.dispose();
      handler(payload);
    });

    return subscription;
  }

  off<E extends Handlers>(event?: E) {
    if (event == null) {
      this.#values ??= Object.values(this.events);

      this.#values.forEach((value) => {
        if (value instanceof Set) {
          value.clear();

        } else {
          value.length = 0;
        }
      });

    } else if (event instanceof Set) {
      event.clear();

    } else {
      event.length = 0;
    }
  }

  emit<E extends Handlers>(event: E, ...payload: E["PayloadType"] extends void ? any : [E["PayloadType"]]): void;
  emit<E extends Handlers>(event: E, payload: E["PayloadType"]) {
    if (event instanceof Set) {
      for (const box of event) {
        if (!box.sleeping) {
          box.handler(payload);
        }
      }

    } else {
      for (let index = 0; index < event.length;) {
        const box = event[index]!;

        if (!box.sleeping) {
          box.handler(payload);
        }

        index = event[box.ptr] === box ? box.ptr + 1 : index;
      }
    }

    if (event.flush != null) {
      this.emit(event.flush, payload);
    }
  }

  #remove(event: Handlers, box: HandlerBox) {
    if (event instanceof Set) {
      event.delete(box);
      return;
    }

    const { ptr } = box;

    if (event[ptr] !== box) {
      return;
    }

    const last = event.pop()!;

    if (last !== box) {
      event[ptr] = last;
      last.ptr = ptr;
    }

    box.ptr = -1;
  }
}
