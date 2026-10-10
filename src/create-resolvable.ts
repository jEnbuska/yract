/**
 * Create a Promise with externally-accessible resolve/reject functions.
 * @internal
 */
export function createResolvable<T = void>() {
  return Promise.withResolvers<T>();
}
