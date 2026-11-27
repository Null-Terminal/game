export type Handler<T = any> = (payload: T) => void;

export interface Subscription extends Disposable {
  sleep(): void;
  wake(): void;
  dispose(): void;
}

export interface EventOptions {
  // Добавляет событие .flush, вызываемое после основного
  withFlush?: boolean;

  // Сохраняет порядок подписчиков при удалении
  ordered?: boolean;
}
