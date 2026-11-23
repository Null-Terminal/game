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

export type BoundHandlers<E extends Handlers> = E & {
  on(handler: Handler<E["PayloadType"]>): Subscription;
  once(handler: Handler<E["PayloadType"]>): Subscription;
  emit(...payload: E["PayloadType"] extends void ? [value?: E["PayloadType"]] : [value: E["PayloadType"]]): void;
  flush?: BoundHandlers<Handlers<E["PayloadType"]>>;
};

type BoundEvents<T extends Record<string, Handlers>> = {
  readonly [K in keyof T]: BoundHandlers<T[K]>;
};

export interface Subscription extends Disposable {
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
  readonly events: BoundEvents<T>;

  #values: Handlers[] | null = null;

  constructor(events: T) {
    this.events = events as BoundEvents<T>;

    for (const event of Object.values(events)) {
      this.#bind(event);
    }
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

    const dispose = () => {
      if (disposed) {
        return;
      }

      disposed = true;
      this.#remove(event, box);
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
      this.#values.forEach((value) => this.off(value));

    } else if (event instanceof Set) {
      event.clear();

    } else {
      event.length = 0;
    }

    if (event?.flush != null) {
      this.off(event.flush);
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

  #bind<P>(event: Handlers<P>) {
    Object.defineProperties(event, {
      on: { value: (listener: Handler<P>) => this.on(event, listener) },
      once: { value: (listener: Handler<P>) => this.once(event, listener) },
      emit: { value: (payload: P) => this.emit(event, payload) }
    });

    if (event.flush != null) {
      this.#bind(event.flush);
    }
  }
}
