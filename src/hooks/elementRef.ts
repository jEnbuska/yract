import type { ElementRefHookState } from "../render/types";

import { $ELEMENT_REF } from "./constants";
import type { ElementRefHookDescription } from "./types";
import type { AnyElement } from "../render/elements/namespaces";
import type { ElementRef } from "../render/element-props/types";
import { REF_ATTR } from "../render/element-props/prop-key";

export function* useElementRef<T extends AnyElement>(): Generator<
  ElementRefHookDescription,
  ElementRef<T>
> {
  const result: ElementRefHookState<T> = yield {
    type: $ELEMENT_REF,
  } satisfies ElementRefHookDescription;
  return result.ref;
}

let idCounter = 0;
function nextId(): string {
  return `:element-ref-${idCounter++}:`;
}

/** @internal */
export function processElementRef(prev?: ElementRefHookState): ElementRefHookState {
  if (prev !== undefined) return prev;
  const identifier = nextId();
  return {
    type: $ELEMENT_REF,
    ref: {
      get current(): undefined | AnyElement {
        return document.querySelector(`[${REF_ATTR}="${identifier}"]`) ?? undefined;
      },
      identifier,
    },
  };
}
