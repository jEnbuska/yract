/**
 * Create a Promise with externally-accessible resolve/reject functions.
 */
export function createResolvable<T = void>(): PromiseWithResolvers<T> & { resolved: boolean } {
  return {
    ...Promise.withResolvers<T>(),
    resolved: false,
  };
}
