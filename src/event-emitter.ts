export type Handler<T = any> = (payload: T) => void;

export type Destructor = () => void;

export type Handlers<P = any> = ({ handler: Handler; ptr: number })[] & {
  PayloadType: P;
  flush?: Handlers<P>;
};

export function handler<P>(opts?: { withFlush?: boolean }): Handlers<P> {
  const event: Handlers<P> = [] as any;

  if (opts?.withFlush) {
    event.flush = handler<P>();
  }

  return event;
}

export class EventEmitter<T extends Record<string, Handlers>> {
  readonly events: Readonly<T>;

  #values: Handlers[] | null = null;

  constructor(events: T) {
    this.events = events;
  }

  on<E extends Handlers>(event: E, handler: Handler<E["PayloadType"]>): Destructor {
    const box = { handler, ptr: event.length };
    event.push(box);

    let deleted = false;

    return () => {
      const { ptr } = box;

      if (deleted || event[ptr] !== box) {
        deleted = true;
        return;
      }

      if (ptr !== event.length - 1) {
        event[ptr] = event[event.length - 1]!;
        event[ptr].ptr = ptr;
      }

      event.pop();
      deleted = true;
    };
  }

  once<E extends Handlers>(event: E, handler: Handler<E["PayloadType"]>): Destructor {
    let deleted = false;

    const destructor = () => {
      const { ptr } = box;

      if (deleted || event[ptr] !== box) {
        deleted = true;
        return;
      }

      if (ptr !== event.length - 1) {
        event[ptr] = event[event.length - 1]!;
        event[ptr].ptr = ptr;
      }

      event.pop();
      deleted = true;
    };

    const wrapper = (payload: E["PayloadType"]) => {
      handler(payload);
      destructor();
    };

    const box = { handler: wrapper, ptr: event.length };
    event.push(box);

    return destructor;
  }

  off<E extends Handlers>(event?: E) {
    if (event == null) {
      this.#values ??= Object.values(this.events);

      this.#values.forEach((event) => {
        event.length = 0;
      });

    } else {
      event.length = 0;
    }
  }

  emit<E extends Handlers>(event: E, ...payload: E["PayloadType"] extends void ? any : [E["PayloadType"]]): void;
  emit<E extends Handlers>(event: E, payload: E["PayloadType"]) {
    event.forEach(({ handler }) => handler(payload));

    if (event.flush != null) {
      this.emit(event.flush, payload);
    }
  }
}
