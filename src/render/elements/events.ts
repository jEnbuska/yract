/**
 * Per-element event listener registration.
 *
 * One listener per element + prop, attached once and then re-pointed. Inline
 * handlers change identity on every render, so re-attaching would mean a
 * `removeEventListener`/`addEventListener` pair per element per render; instead
 * the listener closes over a mutable `wrapper` and only `wrapper.current` moves.
 */
import { getOrInsert, getOrInsertComputed } from "../../general";
import type { AnyElement } from "./namespaces";

/**
 * What every `on*` prop receives: the real DOM event, unwrapped.
 * @internal
 */
export type ElementEventHandler = (event: Event) => void;

type ListenerWrapper = {
  current: ElementEventHandler | undefined;
  initialized: boolean;
};
const elementEventMaps = new WeakMap<AnyElement, Map<string, ListenerWrapper>>();
/** @internal */
export function registerElementEvent(
  el: AnyElement,
  domEvent: string,
  handler: (...args: any) => any,
): void {
  const map = getOrInsertComputed(elementEventMaps, el, () => new Map<string, ListenerWrapper>());
  const wrapper = getOrInsert(map, domEvent, { current: undefined, initialized: false });
  wrapper.current = handler;
  ensureListener(el, domEvent, wrapper);
}

/**
 * Every listener is registered in the bubble phase.
 *
 * TODO: support `on*Capture`. Three parts, and none of them work alone:
 *   1. Have `resolveEventProp` strip the suffix and return the flag, then pass
 *      it as `addEventListener`'s third argument here — that is what picks the
 *      phase, and nothing else does.
 *   2. Add `on${Capitalize<K>}Capture` to `EventHandlers` in `jsx-types.ts`.
 *   3. If listeners ever start being detached rather than having `current`
 *      nulled, `removeEventListener` needs the same flag — a mismatch makes
 *      removal silently fail.
 *
 * Nothing parses the suffix today, so `onClickCapture` resolves to the
 * nonexistent event "clickcapture" and registers a listener that can never
 * fire. It is also already a type error, since `EventHandlers` has no Capture
 * variants — so only untyped callers can reach that.
 */
function ensureListener(el: AnyElement, domEvent: string, wrapper: ListenerWrapper) {
  if (wrapper.initialized) return;
  el.addEventListener(domEvent, function eventHandler(e: Event) {
    wrapper.current?.(e);
  });

  wrapper.initialized = true;
}

/** @internal */
export function unRegisterElementEvent(el: AnyElement, domEvent: string): void {
  const map = getOrInsertComputed(elementEventMaps, el, () => new Map<string, ListenerWrapper>());
  const wrapper = getOrInsert(map, domEvent, { current: undefined, initialized: false });
  wrapper.current = undefined;
  ensureListener(el, domEvent, wrapper);
}
