/// <reference lib="webworker" />

import { bakeSprite } from "#engine/animation/bake-sprite";
import type { SpriteLoadData } from "#engine/animation/types";
import type { WorkerRequest, WorkerResponse } from "#/utils/worker-pool";

const scope = self as DedicatedWorkerGlobalScope;

scope.addEventListener("message", async ({ data: { id, payload } }: MessageEvent<WorkerRequest<SpriteLoadData>>) => {
  try {
    const bitmap = await bakeSprite(payload);
    scope.postMessage({ id, value: bitmap } satisfies WorkerResponse<ImageBitmap>, [bitmap]);

  } catch (error) {
    scope.postMessage({ id, error: String(error) } satisfies WorkerResponse<ImageBitmap>);
  }
});
