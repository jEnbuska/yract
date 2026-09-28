/**
 * Let the scheduler drain. It hops through microtasks and, for deferred work,
 * `setTimeout`, so waiting on a few macrotasks settles any render.
 */
export async function flush(macrotasks = 3): Promise<void> {
  for (let i = 0; i < macrotasks; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
