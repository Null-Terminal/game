import { WorkerClient, WorkerPool } from "#/utils/worker-pool";
import { createEchoWorkerUrl, type EchoRequest } from "#/utils/worker-pool/tests/echo-worker";
import { WebGLCanvasContext } from "#engine/rendering/webgl/context";
import { loadSprite } from "#engine/animation/load-sprite";

export async function retireIdleWorker() {
  const url = createEchoWorkerUrl();
  const pool = new WorkerPool(1, { idleTimeoutMs: 30 });

  let created = 0;
  let terminated = 0;

  class EchoWorker extends WorkerClient<EchoRequest, number> {
    readonly worker = trackedWorker(url, () => terminated++);

    constructor() {
      super();
      created++;
    }
  }

  try {
    const first = await pool.run(EchoWorker, { value: 1 });
    const second = await pool.run(EchoWorker, { value: 2 });
    const reusedBeforeTimeout = created === 1;

    await delay(80);

    const retiredAfterTimeout = terminated === 1;
    const third = await pool.run(EchoWorker, { value: 3 });

    return {
      values: [first, second, third],
      reusedBeforeTimeout,
      retiredAfterTimeout,
      created
    };

  } finally {
    pool.destroy();
    URL.revokeObjectURL(url);
  }
}

export async function keepIdleWorkerWithoutTimeout() {
  const url = createEchoWorkerUrl();
  const pool = new WorkerPool(1, { idleTimeoutMs: null });

  let created = 0;
  let terminated = 0;

  class EchoWorker extends WorkerClient<EchoRequest, number> {
    readonly worker = trackedWorker(url, () => terminated++);

    constructor() {
      super();
      created++;
    }
  }

  try {
    const first = await pool.run(EchoWorker, { value: 1 });
    await delay(80);

    const aliveWhileIdle = terminated === 0;
    const second = await pool.run(EchoWorker, { value: 2 });

    pool.destroy();

    return { values: [first, second], aliveWhileIdle, created, terminated };

  } finally {
    pool.destroy();
    URL.revokeObjectURL(url);
  }
}

export async function keepBusyWorker() {
  const url = createEchoWorkerUrl();
  const pool = new WorkerPool(1, { idleTimeoutMs: 30 });

  let created = 0;
  let terminated = 0;

  class EchoWorker extends WorkerClient<EchoRequest, number> {
    readonly worker = trackedWorker(url, () => terminated++);

    constructor() {
      super();
      created++;
    }
  }

  try {
    const first = pool.run(EchoWorker, { value: 1, delay: 300 });
    const second = pool.run(EchoWorker, { value: 2 });

    await delay(80);

    const aliveWhileBusy = terminated === 0;
    const values = await Promise.all([first, second]);
    const reusedForQueuedJob = created === 1;

    await delay(80);

    return { values, aliveWhileBusy, reusedForQueuedJob, retiredAfterQueue: terminated === 1 };

  } finally {
    pool.destroy();
    URL.revokeObjectURL(url);
  }
}

export async function useTransferredBitmapAfterRetirement() {
  const source = `
    self.onmessage = ({ data: { id } }) => {
      const canvas = new OffscreenCanvas(2, 2);
      const context = canvas.getContext("2d");
      context.fillStyle = "#ff0000";
      context.fillRect(0, 0, 2, 2);

      const bitmap = canvas.transferToImageBitmap();
      self.postMessage({ id, value: bitmap }, [bitmap]);
    };
  `;

  const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  const pool = new WorkerPool(1, { idleTimeoutMs: 30 });

  let terminated = 0;

  class BitmapWorker extends WorkerClient<null, ImageBitmap> {
    readonly worker = trackedWorker(url, () => terminated++);
  }

  try {
    const bitmap = await pool.run(BitmapWorker, null);
    await delay(80);

    const canvas = new OffscreenCanvas(2, 2);
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);

    const pixel = [...context.getImageData(0, 0, 1, 1).data];

    const element = document.createElement("canvas");
    element.width = 2;
    element.height = 2;

    const webgl = new WebGLCanvasContext(element);
    webgl.drawImage(bitmap, 0, 0);

    const gl = element.getContext("webgl2")!;
    const webglPixel = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, webglPixel);

    webgl.destroy();
    bitmap.close();

    return { terminated, pixel, webglPixel: [...webglPixel] };

  } finally {
    pool.destroy();
    URL.revokeObjectURL(url);
  }
}

export async function useRealSpriteWithPersistentWorker() {
  const image = await loadSprite(
    "/src/sprites/backgrounds/buildings/ruins/city-ruined-residence.webp",
    { removeBackground: true }
  );

  const sample = () => {
    const canvas = new OffscreenCanvas(64, 64);
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    context.drawImage(image, 0, 0, 64, 64);

    return context.getImageData(0, 0, 64, 64).data.reduce((sum, value) => sum + value, 0);
  };

  const before = sample();
  await delay(250);
  const after = sample();

  return { before, after, width: image.width, height: image.height };
}

function trackedWorker(url: string, onTerminate: () => void) {
  const worker = new Worker(url);
  const terminate = worker.terminate.bind(worker);

  worker.terminate = () => {
    onTerminate();
    terminate();
  };

  return worker;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
