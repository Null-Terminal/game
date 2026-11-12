import type { WorkerClient } from "#/utils/worker-pool";

export interface WorkerRequest<T> {
  id: number;
  payload: T;
}

export type WorkerResponse<T> =
  | { id: number; value: T }
  | { id: number; error: string };

export type WorkerClass = new () => WorkerClient<unknown, unknown>;

export interface WorkerJob {
  id: number;
  workerClass: WorkerClass;
  payload: unknown;
  transfer: Transferable[];
  resolve(value: unknown): void;
  reject(error: Error): void;
}

export interface WorkerSlot {
  workerClass: WorkerClass;
  worker: Worker;
  job: WorkerJob | null;
}
