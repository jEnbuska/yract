import type { IdHookState } from "../render/types";
import { type IdHookDescriptor } from "./types";
import { $ID } from "./constants";

let idCounter = 0;

function nextId(): string {
  return `:r${idCounter++}:`;
}

/**
 * Stable unique ID hook. Returns a string ID that is stable across re-renders.
 */
export function* useId(): Generator<IdHookDescriptor, string, IdHookState> {
  const desc: IdHookDescriptor = { type: $ID };
  const result = yield desc;
  return result.id;
}

/** @internal */
export function processId(prev?: IdHookState): IdHookState {
  if (prev !== undefined) return prev;
  return { type: $ID, id: nextId() };
}
