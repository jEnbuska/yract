import type { Fiber } from "../instances/types";

export type MapFiberGroup<T extends WeakMap<Fiber, boolean> = WeakMap<Fiber, boolean>> = {
  queues: Fiber[][];
  members: T;
  size: number;
  cancelled: number;
};

export type SetFiberGroup<T extends WeakSet<Fiber> = WeakSet<Fiber>> = {
  queues: Fiber[][];
  members: T;
  size: number;
  cancelled: number;
};