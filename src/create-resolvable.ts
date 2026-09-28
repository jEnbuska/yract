/**
 * Create a Promise with externally-accessible resolve/reject functions.
 * @internal
 */
export function createResolvable<T = void>(): PromiseWithResolvers<T> & { resolved: boolean } {
  return {
    ...Promise.withResolvers<T>(),
    resolved: false,
  };
}
