import { isPositive } from "#/utils/validators";

import type { WorkerClass, WorkerJob, WorkerPoolOptions, WorkerRequest, WorkerResponse, WorkerSlot } from "#/utils/worker-pool/types";

export type { WorkerPoolOptions, WorkerRequest, WorkerResponse } from "#/utils/worker-pool/types";

const DEFAULT_IDLE_TIMEOUT_MS = 30_000;

export abstract class WorkerClient<Request, Result> {
  declare readonly RequestType: Request;
  declare readonly ResultType: Result;
  abstract readonly worker: Worker;
}

export class WorkerPool {
  readonly #slots: WorkerSlot[] = [];
  readonly #queue: WorkerJob[] = [];
  readonly #maxWorkers: number;
  readonly #idleTimeoutMs: number | null;

  #nextId = 0;
  #destroyed = false;

  constructor(maxWorkers: number, options: WorkerPoolOptions = {}) {
    if (!Number.isInteger(maxWorkers) || maxWorkers < 1) {
      throw new RangeError("Worker count must be a positive integer");
    }

    const idleTimeoutMs = options.idleTimeoutMs === undefined ? DEFAULT_IDLE_TIMEOUT_MS : options.idleTimeoutMs;

    if (idleTimeoutMs !== null && !isPositive(idleTimeoutMs)) {
      throw new RangeError("Worker idle timeout must be a positive finite number");
    }

    const cores = typeof navigator === "undefined" ? maxWorkers : navigator.hardwareConcurrency;
    this.#maxWorkers = Math.min(maxWorkers, Number.isInteger(cores) && cores > 0 ? cores : maxWorkers);
    this.#idleTimeoutMs = idleTimeoutMs;
  }

  run<Request, Result>(
    WorkerClass: new () => WorkerClient<Request, Result>,
    payload: Request,
    transfer: Transferable[] = []
  ): Promise<Result> {
    if (this.#destroyed) {
      return Promise.reject(new Error("Worker pool is destroyed"));
    }

    return new Promise<Result>((resolve, reject) => {
      this.#queue.push({
        id: this.#nextId++,
        workerClass: WorkerClass,
        payload,
        transfer,
        resolve: (value) => resolve(value as Result),
        reject
      });

      this.#dispatch();
    });
  }

  destroy() {
    this.#destroyed = true;

    for (const job of this.#queue) {
      job.reject(new Error("Worker pool is destroyed"));
    }

    this.#queue.length = 0;

    for (const slot of this.#slots) {
      slot.job?.reject(new Error("Worker pool is destroyed"));
      this.#clearIdleTimer(slot);
      slot.worker.terminate();
    }

    this.#slots.length = 0;
  }

  #dispatch() {
    while (this.#queue.length > 0) {
      const job = this.#queue[0]!;
      let slot: WorkerSlot | null;

      try {
        slot = this.#getSlot(job.workerClass);

      } catch (err) {
        this.#queue.shift();
        job.reject(err instanceof Error ? err : new Error(String(err)));
        continue;
      }

      if (slot == null) {
        return;
      }

      this.#queue.shift();
      slot.job = job;

      try {
        slot.worker.postMessage({ id: job.id, payload: job.payload } satisfies WorkerRequest<unknown>, job.transfer);

      } catch (err) {
        slot.job = null;
        job.reject(err instanceof Error ? err : new Error(String(err)));
        this.#scheduleIdle(slot);
      }
    }
  }

  #getSlot(WorkerClass: WorkerClass): WorkerSlot | null {
    const same = this.#slots.find((slot) => slot.job == null && slot.workerClass === WorkerClass);

    if (same != null) {
      this.#clearIdleTimer(same);
      return same;
    }

    if (this.#slots.length < this.#maxWorkers) {
      const slot = this.#createSlot(WorkerClass);
      this.#slots.push(slot);
      return slot;
    }

    const other = this.#slots.find((slot) => slot.job == null);

    if (other == null) {
      return null;
    }

    const index = this.#slots.indexOf(other);

    this.#clearIdleTimer(other);
    other.worker.terminate();
    this.#slots.splice(index, 1);

    const replacement = this.#createSlot(WorkerClass);
    this.#slots.push(replacement);

    return replacement;
  }

  #createSlot(WorkerClass: WorkerClass): WorkerSlot {
    const worker = new WorkerClass().worker;
    const slot: WorkerSlot = { workerClass: WorkerClass, worker, job: null, idleTimer: null };

    worker.addEventListener("message", ({ data }: MessageEvent<WorkerResponse<unknown>>) => {
      const job = slot.job;

      if (job == null || data.id !== job.id) {
        return;
      }

      slot.job = null;

      if ("error" in data) {
        job.reject(new Error(data.error));

      } else {
        job.resolve(data.value);
      }

      this.#dispatch();
      this.#scheduleIdle(slot);
    });

    const fail = (event: ErrorEvent | MessageEvent) => {
      slot.job?.reject(new Error(event instanceof ErrorEvent ? event.message : "Worker message could not be decoded"));
      this.#clearIdleTimer(slot);
      worker.terminate();

      const index = this.#slots.indexOf(slot);

      if (index !== -1) {
        this.#slots.splice(index, 1);
      }

      this.#dispatch();
    };

    worker.addEventListener("error", fail);
    worker.addEventListener("messageerror", fail);

    return slot;
  }

  #scheduleIdle(slot: WorkerSlot) {
    if (this.#idleTimeoutMs === null || this.#destroyed || slot.job != null || !this.#slots.includes(slot)) {
      return;
    }

    this.#clearIdleTimer(slot);
    slot.idleTimer = setTimeout(() => {
      slot.idleTimer = null;

      if (slot.job != null) {
        return;
      }

      const index = this.#slots.indexOf(slot);

      if (index !== -1) {
        this.#slots.splice(index, 1);
        slot.worker.terminate();
      }
    }, this.#idleTimeoutMs);
  }

  #clearIdleTimer(slot: WorkerSlot) {
    if (slot.idleTimer != null) {
      clearTimeout(slot.idleTimer);
      slot.idleTimer = null;
    }
  }
}
