import { type IdHookDescriptor } from "./hook-descriptors";
import { $ID } from "./constants";
import type { IdHookState } from "./hook-states";

let idCounter = 0;

function nextId(): string {
  return `:id${idCounter++}:`;
}

/**
 * Stable unique ID hook. Returns a string ID that is stable across re-renders.
 */
export function* useId(): Generator<IdHookDescriptor, string> {
  const result: IdHookState = yield { type: $ID } satisfies IdHookDescriptor;
  return result.id;
}

/** @internal */
export function processId(prev?: IdHookState): IdHookState {
  if (prev !== undefined) return prev;
  return { type: $ID, id: nextId() };
}
