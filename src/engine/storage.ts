import { IndexedDBStorage, type Storage } from "#lib/storage";

export type GameStoreName = "settings" | "saves";
export type GameStorage = Storage<GameStoreName>;

export function createGameStorage(): GameStorage {
  return new IndexedDBStorage("null-terminal", 1, ["settings", "saves"]);
}
