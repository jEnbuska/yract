/**
 * Let the scheduler drain. A render pass runs in a microtask; waiting a few
 * macrotasks also covers effects that set state after their own `await`.
 */
export async function flush(macrotasks = 3): Promise<void> {
  for (let i = 0; i < macrotasks; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
