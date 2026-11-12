import { WorkerClient, WorkerPool } from "#/utils/worker-pool";

interface EchoRequest {
  value: number;
  delay?: number;
  fail?: boolean;
  data?: ArrayBuffer;
}

function createEchoWorkerUrl() {
  const source = `
    self.onmessage = ({ data: { id, payload } }) => {
      setTimeout(() => {
        if (payload.fail) {
          self.postMessage({ id, error: "Requested failure" });
        } else {
          self.postMessage({ id, value: payload.data?.byteLength ?? payload.value });
        }
      }, payload.delay ?? 0);
    };
  `;

  return URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
}

export async function reuseWorker() {
  const url = createEchoWorkerUrl();
  const pool = new WorkerPool(2);

  let created = 0;

  class EchoWorker extends WorkerClient<EchoRequest, number> {
    readonly worker = new Worker(url);

    constructor() {
      super();
      created++;
    }
  }

  try {
    const first = await pool.run(EchoWorker, { value: 1 });
    const second = await pool.run(EchoWorker, { value: 2 });
    const [third, fourth] = await Promise.all([
      pool.run(EchoWorker, { value: 3, delay: 20 }),
      pool.run(EchoWorker, { value: 4, delay: 20 })
    ]);

    return { created, values: [first, second, third, fourth] };

  } finally {
    pool.destroy();
    URL.revokeObjectURL(url);
  }
}

export async function reuseByClass() {
  const url = createEchoWorkerUrl();
  const pool = new WorkerPool(1);

  let firstCreated = 0;
  let secondCreated = 0;

  class FirstWorker extends WorkerClient<EchoRequest, number> {
    readonly worker = new Worker(url);

    constructor() {
      super();
      firstCreated++;
    }
  }

  class SecondWorker extends WorkerClient<EchoRequest, number> {
    readonly worker = new Worker(url);

    constructor() {
      super();
      secondCreated++;
    }
  }

  try {
    const values = [
      await pool.run(FirstWorker, { value: 1 }),
      await pool.run(SecondWorker, { value: 2 }),
      await pool.run(FirstWorker, { value: 3 })
    ];

    return { firstCreated, secondCreated, values };

  } finally {
    pool.destroy();
    URL.revokeObjectURL(url);
  }
}

export async function transferAndRecover() {
  const url = createEchoWorkerUrl();
  const pool = new WorkerPool(1);

  class EchoWorker extends WorkerClient<EchoRequest, number> {
    readonly worker = new Worker(url);
  }

  try {
    const data = new ArrayBuffer(16);
    const size = await pool.run(EchoWorker, { value: 0, data }, [data]);
    let error = "";

    try {
      await pool.run(EchoWorker, { value: 0, fail: true });
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }

    const afterFailure = await pool.run(EchoWorker, { value: 7 });
    return { size, detachedSize: data.byteLength, error, afterFailure };

  } finally {
    pool.destroy();
    URL.revokeObjectURL(url);
  }
}

export async function limitByHardwareConcurrency() {
  const url = createEchoWorkerUrl();
  Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, value: 1 });

  const pool = new WorkerPool(4);
  let created = 0;

  class EchoWorker extends WorkerClient<EchoRequest, number> {
    readonly worker = new Worker(url);

    constructor() {
      super();
      created++;
    }
  }

  try {
    const values = await Promise.all([
      pool.run(EchoWorker, { value: 1, delay: 20 }),
      pool.run(EchoWorker, { value: 2, delay: 20 }),
      pool.run(EchoWorker, { value: 3, delay: 20 })
    ]);

    return { created, values };

  } finally {
    pool.destroy();
    URL.revokeObjectURL(url);
    Reflect.deleteProperty(navigator, "hardwareConcurrency");
  }
}
