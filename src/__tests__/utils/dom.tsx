/**
 * DOM helpers shared by the render-level tests.
 *
 * The event helpers replay what a browser dispatches for each kind of user
 * action, because yract's controlled-input restore depends on that sequence
 * (`beforeinput` → `input` for typing, `input` alone for autofill, …).
 */
import { type Child, type PropsWithChildren, render } from "yract";
import { flush } from "./flush";

function* MountInner({ children }: PropsWithChildren) {
  return children as Child;
}

/**
 * Two component levels between the root and the tree under test. A leaf
 * component directly under a root currently renders nothing (see the pinned
 * `it.fails` in smoke.test.tsx), which would mask what these tests check.
 */
function* MountHost({ children }: PropsWithChildren) {
  return <MountInner>{children}</MountInner>;
}

/** Render into a container attached to `document` and let it settle. */
export async function mount(child: Child): Promise<HTMLElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  render(<MountHost>{child}</MountHost>, container);
  await flush();
  return container;
}

export function byTestId<T extends Element = HTMLElement>(root: ParentNode, id: string): T {
  const el = root.querySelector<T>(`[data-testid="${id}"]`);
  if (!el) throw new Error(`No element with data-testid="${id}"`);
  return el;
}

/** Typing: `beforeinput`, the browser writes the value, then `input`. */
export function typeText(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  el.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true }));
  el.value = value;
  el.dispatchEvent(new InputEvent("input", { bubbles: true }));
}

/** Autofill and password managers: no `beforeinput`, just `input` + `change`. */
export function autofill(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Picking an option: the value changes, then `input` + `change`. */
export function selectOption(el: HTMLSelectElement, value: string): void {
  el.dispatchEvent(new FocusEvent("focus"));
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Dragging a range: `mousedown`, the value moves, then `input`. */
export function slideTo(el: HTMLInputElement, value: string): void {
  el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
