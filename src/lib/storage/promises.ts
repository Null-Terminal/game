import { cast } from "#/utils/cast";

import type { PromiseStore } from "#lib/storage/types";

export function requestPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

export function transactionPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error), { once: true });
  });
}

export function promiseStore(store: IDBObjectStore): PromiseStore {
  return cast<PromiseStore>(new Proxy(store, {
    get(target, key) {
      const value: unknown = Reflect.get(target, key, target);

      if (typeof value !== "function") {
        return value;
      }

      return (...args: unknown[]) => {
        const request = Reflect.apply(value, target, args) as IDBRequest<unknown>;
        return requestPromise(request);
      };
    }
  }));
}
