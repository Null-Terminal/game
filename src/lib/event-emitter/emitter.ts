import type { EventChannel } from "#lib/event-emitter/channel";
import type { Handler, Subscription } from "#lib/event-emitter/types";

export class EventEmitter<T extends Record<string, EventChannel<any>>> {
  readonly events: Readonly<T>;

  constructor(events: T) {
    this.events = events;
  }

  on<P>(event: EventChannel<P>, listener: Handler<P>): Subscription {
    return event.on(listener);
  }

  once<P>(event: EventChannel<P>, listener: Handler<P>): Subscription {
    return event.once(listener);
  }

  emit<P>(event: EventChannel<P>, payload: P): void;
  emit<P>(event: EventChannel<P>, ...payload: P extends void ? [] : never): void;
  emit<P>(event: EventChannel<P>, payload?: P) {
    event.emit(payload as P);
  }

  off(event?: EventChannel<any>) {
    if (event != null) {
      event.off();
      return;
    }

    for (const event of Object.values(this.events)) {
      event.off();
    }
  }
}
