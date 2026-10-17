/**
 * Public render entry points.
 *
 * `createRoot(container)` returns a `Root` for the container, with its own
 * `Scheduler`; call `root.render(child)` to mount into it. `render(child,
 * container)` is a one-shot convenience that creates the Root, renders `child`
 * and returns the Root.
 */

import type { Child } from "../jsx";
import { Root } from "../instances/root";

export function createRoot(container: Element): Root {
  return new Root(container);
}

export function render(child: Child, container: Element): Root {
  const root = new Root(container);
  root.render(child);
  return root;
}
