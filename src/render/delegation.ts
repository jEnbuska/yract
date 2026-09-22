/**
 * Prop-name to DOM-event mapping.
 *
 * Handlers are attached directly to their own element (see
 * `registerElementEvent` in `element-props.ts`), so all this has to do is turn
 * an `on*` prop name into the event name to listen for.
 */

// ---------------------------------------------------------------------------
// Prop name → DOM event mapping
// ---------------------------------------------------------------------------

const PROP_TO_DOM_EVENT: Record<string, string> = {
  onDoubleClick: "dblclick",
  onFocus: "focusin",
  onBlur: "focusout",
};

/**
 * Maps an `on*` prop name to the DOM event name it listens for.
 *
 * TODO: `on*Capture` is not handled. Capture support means stripping the
 * suffix here and returning the flag alongside `domEvent`, and it only works
 * together with the two TODOs it pairs with: the `addEventListener` third
 * argument in `ensureListener` (`render/element-props.ts`) and the
 * `on*Capture` clause in `EventHandlers` (`jsx-types.ts`).
 */
export function resolveEventProp(propKey: string): { domEvent: string } {
  const mapped = PROP_TO_DOM_EVENT[propKey];
  if (mapped) return { domEvent: mapped };
  return { domEvent: propKey.slice(2).toLowerCase() };
}
