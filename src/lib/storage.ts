import { promiseStore, requestPromise, transactionPromise } from "#/storage/promises";
import type { Storage } from "#/storage/types";

export type { Storage } from "#/storage/types";

export class IndexedDBStorage<S extends string> implements Storage<S> {
  readonly #databaseName: string;
  readonly #version: number;
  readonly #stores: readonly S[];

  #database: Promise<IDBDatabase> | null = null;
  #destroyed = false;

  get destroyed() {
    return this.#destroyed;
  }

  constructor(databaseName: string, version: number, stores: readonly S[]) {
    this.#databaseName = databaseName;
    this.#version = version;
    this.#stores = stores;
  }

  async get<T>(store: S, key: IDBValidKey): Promise<T | undefined> {
    const database = await this.#getDatabase();
    return promiseStore(database.transaction(store, "readonly").objectStore(store)).get<T>(key);
  }

  async put(store: S, key: IDBValidKey, value: unknown): Promise<void> {
    const database = await this.#getDatabase();
    const transaction = database.transaction(store, "readwrite");

    await Promise.all([
      promiseStore(transaction.objectStore(store)).put(value, key),
      transactionPromise(transaction)
    ]);
  }

  async delete(store: S, key: IDBValidKey): Promise<void> {
    const database = await this.#getDatabase();

    const transaction = database.transaction(store, "readwrite");

    await Promise.all([
      promiseStore(transaction.objectStore(store)).delete(key),
      transactionPromise(transaction)
    ]);
  }

  async getAllKeys(store: S): Promise<IDBValidKey[]> {
    const database = await this.#getDatabase();

    return promiseStore(database.transaction(store, "readonly").objectStore(store)).getAllKeys();
  }

  destroy() {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;

    const pending = this.#database;
    this.#database = null;

    if (pending != null) {
      void pending.then((database) => database.close(), () => {});
    }
  }

  [Symbol.dispose]() {
    this.destroy();
  }

  async #getDatabase(): Promise<IDBDatabase> {
    if (this.#destroyed) {
      throw new Error(`${this.constructor.name}: storage was destroyed`);
    }

    const database = await this.#open();

    if (this.#destroyed) {
      throw new Error(`${this.constructor.name}: storage was destroyed`);
    }

    return database;
  }

  #open(): Promise<IDBDatabase> {
    if (this.#database != null) {
      return this.#database;
    }

    const request = indexedDB.open(this.#databaseName, this.#version);

    request.addEventListener("upgradeneeded", () => {
      const database = request.result;

      for (const store of this.#stores) {
        if (!database.objectStoreNames.contains(store)) {
          database.createObjectStore(store);
        }
      }
    });

    const pending = requestPromise(request);
    this.#database = pending;

    void pending.then((database) => {
      database.addEventListener("versionchange", () => {
        database.close();

        if (this.#database === pending) {
          this.#database = null;
        }
      });

    }, () => {
      if (this.#database === pending) {
        this.#database = null;
      }
    });

    return pending;
  }
}
