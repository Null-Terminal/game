import { WorkerClient, WorkerPool } from "#/utils/worker-pool";

import { bakeSprite } from "#engine/animation/bake-sprite";
import type { LoadSpriteOptions, SpriteLoadData } from "#engine/animation/types";

const spriteCache = new Map<string, Promise<ImageBitmap>>();
const MAX_SPRITE_WORKERS = 4;

class SpriteWorker extends WorkerClient<SpriteLoadData, ImageBitmap> {
  readonly worker = new Worker(new URL("./load-sprite-worker.ts", import.meta.url), { type: "module" });
}

const workerPool = typeof Worker === "undefined" ? null :
  new WorkerPool(MAX_SPRITE_WORKERS, { idleTimeoutMs: null });

export function loadSprite(url: string, options: LoadSpriteOptions = {}): Promise<ImageBitmap> {
  const { removeBackground = false, tolerance = 5 } = options ?? {};

  const cacheKey = [url, removeBackground, tolerance].join("_");

  const fromCache = spriteCache.get(cacheKey);

  if (fromCache != null) {
    return fromCache;
  }

  const promise = loadSpriteUncached(url, options);

  spriteCache.set(cacheKey, promise);

  return promise;
}

async function loadSpriteUncached(url: string, options: LoadSpriteOptions): Promise<ImageBitmap> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load sprite ${url}: ${response.status}`);
  }

  const payload: SpriteLoadData = {
    headers: { contentType: response.headers.get("content-type") ?? "image/webp" },
    data: await response.arrayBuffer(),
    options
  };

  if (workerPool == null) {
    return bakeSprite(payload);
  }

  return workerPool.run(SpriteWorker, payload, [payload.data]);
}
