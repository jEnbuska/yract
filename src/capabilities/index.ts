/**
 * Capabilities — the `with*` counterpart to hooks.
 *
 * Like hooks they are consumed with `yield*`, but unlike hooks they allocate
 * no slot in the component's hook table: the driver handles each of these
 * without advancing `hookIndex`. That is what lets them be called
 * conditionally, or in a different order from one render to the next.
 */
export { withRerender } from "./rerender";
export { withHalt } from "./halt";
export { withIsHalted } from "./halted";
export { withReturn } from "./return";
export { withIdle } from "./idle";
