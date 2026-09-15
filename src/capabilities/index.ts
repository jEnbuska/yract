/**
 * Capabilities — the `do*` counterpart to hooks.
 *
 * Like hooks they are consumed with `yield*`, but unlike hooks they allocate
 * no slot in the component's hook table: the driver handles each of these
 * without advancing `hookIndex`. That is what lets them be called
 * conditionally, or in a different order from one render to the next.
 */
export { doRerender } from "./rerender";
export { doHalt } from "./halt";
export { doIsHalted } from "./halted";
export { doReturn } from "./return";
