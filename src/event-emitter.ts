export type Handler<T = any> = (payload: T) => void;

export type Destructor = () => void;

export type Handlers<P = any> = Handler[] & { PayloadType: P };

export function handler<P>(): Handlers<P> {
  return [] as any;
}

export class EventEmitter<T extends Record<string, Handlers>> {
  readonly events: Readonly<T>;

  #values: Handlers[] | null = null;

  constructor(events: T) {
    this.events = events;
  }

  on<E extends Handlers>(event: E, handler: Handler<E["PayloadType"]>): Destructor {
    const i = event.push(handler) - 1;

    let deleted = false;

    return () => {
      if (deleted) {
        return;
      }

      if (i !== event.length - 1) {
        event[i] = event[event.length - 1]!;
      }

      event.pop();
      deleted = true;
    };
  }

  once<E extends Handlers>(event: E, handler: Handler<E["PayloadType"]>): Destructor {
    let deleted = false;

    const destructor = () => {
      if (deleted) {
        return;
      }

      if (i !== event.length - 1) {
        event[i] = event[event.length - 1]!;
      }

      event.pop();
      deleted = true;
    };

    const wrapper = (payload: E["PayloadType"]) => {
      handler(payload);
      destructor();
    };

    const i = event.push(wrapper) - 1;
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
    event.forEach((handler) => handler(payload));
  }
}
