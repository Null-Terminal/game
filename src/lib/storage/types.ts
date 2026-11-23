export interface Storage<S extends string = string> extends Disposable {
  get<T>(store: S, key: IDBValidKey): Promise<T | undefined>;
  put(store: S, key: IDBValidKey, value: unknown): Promise<void>;
  delete(store: S, key: IDBValidKey): Promise<void>;
  getAllKeys(store: S): Promise<IDBValidKey[]>;
  destroy(): void;
}

export interface PromiseStore {
  get<T>(key: IDBValidKey): Promise<T | undefined>;
  put(value: unknown, key: IDBValidKey): Promise<IDBValidKey>;
  delete(key: IDBValidKey): Promise<undefined>;
  getAllKeys(): Promise<IDBValidKey[]>;
}
