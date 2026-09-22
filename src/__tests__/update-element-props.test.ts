/**
 * Commit-writer contract for `updateElementProps`.
 *
 * These tests run against real jsdom elements to pin the DOM side of the
 * patch contract — the diff tests (`diff-element-props.test.ts`) cover
 * patch shape, this file covers "given this patch, the DOM looks like X."
 */
import { beforeEach, describe, expect, it } from "vitest";
import { type ElementPatch, updateElementProps, type WeakRefLike } from "../render/element-props";

function makeRoot(): Element {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

/**oayground/src/sections/deferred/-components/PersonTabl
 * A `WeakRefLike` for tests, mirroring what `processWeakRef` builds: the getter
 * hands back a stable wrapper whose `deref()` reads the current WeakRef, and
 * the setter re-wraps. Reading `.current` therefore gives the wrapper, not the
 * element — assertions go through `.current`.
 */
function makeWeakRef<T extends WeakKey>(initial?: T): WeakRefLike<T> {
  let current: WeakRef<T> | undefined = initial === undefined ? undefined : new WeakRef(initial);
  const wrapper = { deref: (): T | undefined => current?.deref() };
  // The symbol index signature on WeakRefLike cannot be produced by a literal.
  return {
    get current(): { deref(): T | undefined } {
      return wrapper;
    },
    set current(value: T | undefined) {
      current = value === undefined ? undefined : new WeakRef(value);
    },
  } as WeakRefLike<T>;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("updateElementProps: style", () => {
  it("applies a full-replace style object to an element with no prior inline styles", () => {
    const container = makeRoot();
    const el = document.createElement("div");
    container.appendChild(el);

    const patch: ElementPatch = { style: { color: "rgb(255, 0, 0)", paddingLeft: "4px" } };
    updateElementProps(el, patch);

    expect(el.style.color).toBe("rgb(255, 0, 0)");
    expect(el.style.paddingLeft).toBe("4px");
  });

  it("applies a delta style object — new values land, '' entries clear", () => {
    const container = makeRoot();
    const el = document.createElement("div");
    el.style.color = "red";
    el.style.padding = "4px";
    container.appendChild(el);

    const patch: ElementPatch = { style: { color: "blue", padding: "" } };
    updateElementProps(el, patch);

    expect(el.style.color).toBe("blue");
    expect(el.style.padding).toBe("");
  });

  it("clears all inline styles when style is null", () => {
    const container = makeRoot();
    const el = document.createElement("div");
    el.style.color = "red";
    el.style.padding = "4px";
    container.appendChild(el);

    updateElementProps(el, { style: null });

    expect(el.style.cssText).toBe("");
    expect(el.style.color).toBe("");
    expect(el.style.padding).toBe("");
  });
});

describe("updateElementProps: custom properties", () => {
  it("sets a CSS custom property from the style object", () => {
    const container = makeRoot();
    const el = document.createElement("div");
    container.appendChild(el);

    updateElementProps(el, { style: { "--dos-cols": "1fr 2fr" } });

    expect(el.style.getPropertyValue("--dos-cols")).toBe("1fr 2fr");
  });

  it("sets custom properties alongside regular ones", () => {
    const container = makeRoot();
    const el = document.createElement("div");
    container.appendChild(el);

    updateElementProps(el, { style: { "--gap": "4px", color: "rgb(255, 0, 0)" } });

    expect(el.style.getPropertyValue("--gap")).toBe("4px");
    expect(el.style.color).toBe("rgb(255, 0, 0)");
  });

  it("clears a custom property when the delta sets it to an empty string", () => {
    const container = makeRoot();
    const el = document.createElement("div");
    container.appendChild(el);

    updateElementProps(el, { style: { "--gap": "4px" } });
    updateElementProps(el, { style: { "--gap": "" } });

    expect(el.style.getPropertyValue("--gap")).toBe("");
  });
});

describe("updateElementProps: attrs", () => {
  it("writes setAttrs entries to the DOM", () => {
    const container = makeRoot();
    const el = document.createElement("div");
    container.appendChild(el);

    updateElementProps(el, { setAttrs: { id: "hello", title: "hi", className: "foo bar" } });

    expect(el.id).toBe("hello");
    expect(el.getAttribute("title")).toBe("hi");
    expect(el.className).toBe("foo bar");
  });

  it("removes entries listed in removeAttrs", () => {
    const container = makeRoot();
    const el = document.createElement("div");
    el.setAttribute("title", "bye");
    el.className = "old";
    container.appendChild(el);

    updateElementProps(el, { removeAttrs: ["title", "className"] });

    expect(el.hasAttribute("title")).toBe(false);
    expect(el.className).toBe("");
  });

  it("translates htmlFor to the `for` attribute on label elements", () => {
    const container = makeRoot();
    const label = document.createElement("label");
    container.appendChild(label);

    updateElementProps(label, { setAttrs: { htmlFor: "email-input" } });
    expect(label.getAttribute("for")).toBe("email-input");

    updateElementProps(label, { removeAttrs: ["htmlFor"] });
    expect(label.hasAttribute("for")).toBe(false);
  });
});

describe("updateElementProps: events", () => {
  it("attaches the handler so the event reaches it", () => {
    const container = makeRoot();
    const el = document.createElement("button");
    container.appendChild(el);

    const calls: string[] = [];
    updateElementProps(el, { setEvents: { onClick: () => calls.push("hit") } });

    el.click();

    expect(calls).toEqual(["hit"]);
  });

  it("stops the handler firing for removeEvents entries", () => {
    const container = makeRoot();
    const el = document.createElement("button");
    container.appendChild(el);

    const calls: string[] = [];
    updateElementProps(el, { setEvents: { onClick: () => calls.push("hit") } });
    el.click();
    expect(calls).toEqual(["hit"]);

    updateElementProps(el, { removeEvents: ["onClick"] });
    el.click();

    expect(calls).toEqual(["hit"]);
  });

  it("event swap: remove runs before set, so only the new handler fires", () => {
    const container = makeRoot();
    const el = document.createElement("button");
    container.appendChild(el);

    const calls: string[] = [];

    updateElementProps(el, { setEvents: { onClick: () => calls.push("prev") } });

    // The swap patch emitted by diffElementProps — bucket order matters.
    updateElementProps(el, {
      removeEvents: ["onClick"],
      setEvents: { onClick: () => calls.push("next") },
    });

    el.click();

    expect(calls).toEqual(["next"]);
  });

  it("swapping the handler does not stack a second listener", () => {
    const container = makeRoot();
    const el = document.createElement("button");
    container.appendChild(el);

    const calls: string[] = [];
    // Inline handlers change identity every render, so this is the common path.
    for (let i = 0; i < 3; i++) {
      updateElementProps(el, { setEvents: { onClick: () => calls.push(`h${i}`) } });
    }

    el.click();

    // One stable listener per element+prop, re-pointed rather than re-attached.
    expect(calls).toEqual(["h2"]);
  });
});

describe("updateElementProps: refSwap", () => {
  it("clears prev.current and sets next.current to the element", () => {
    const container = makeRoot();
    const el = document.createElement("div");
    container.appendChild(el);

    const prev = makeWeakRef(el);
    const next = makeWeakRef<HTMLDivElement>();

    updateElementProps(el, { refSwap: { prev, next } });

    expect(prev.current).toBeUndefined();
    expect(next.current).toBe(el);
  });

  it("handles a swap where only next is provided", () => {
    const container = makeRoot();
    const el = document.createElement("div");
    container.appendChild(el);

    const next = makeWeakRef<HTMLDivElement>();
    updateElementProps(el, { refSwap: { prev: undefined, next } });

    expect(next.current).toBe(el);
  });

  it("handles a swap where only prev is provided (ref was removed)", () => {
    const container = makeRoot();
    const el = document.createElement("div");
    container.appendChild(el);

    const prev = makeWeakRef(el);
    updateElementProps(el, { refSwap: { prev, next: undefined } });

    expect(prev.current).toBeUndefined();
  });
});

describe("updateElementProps: bucket ordering", () => {
  it("runs removeAttrs before setAttrs (same key re-added)", () => {
    const container = makeRoot();
    const el = document.createElement("div");
    el.setAttribute("title", "old");
    container.appendChild(el);

    // Contrived: the diff never emits this exact shape, but if a caller ever
    // did, the bucket order matters. We assert the final visible state.
    updateElementProps(el, { removeAttrs: ["title"], setAttrs: { title: "new" } });

    expect(el.getAttribute("title")).toBe("new");
  });

  it("applies every bucket in a combined patch correctly", () => {
    const container = makeRoot();
    const el = document.createElement("div");
    el.setAttribute("title", "old");
    el.style.color = "red";
    container.appendChild(el);

    const fired: string[] = [];
    const prevHandler = () => fired.push("prev");
    const nextHandler = () => fired.push("next");
    updateElementProps(el, { setEvents: { onClick: prevHandler } });

    const nextRef = makeWeakRef<HTMLDivElement>();
    updateElementProps(el, {
      removeAttrs: ["title"],
      setAttrs: { id: "new" },
      removeEvents: ["onClick"],
      setEvents: { onClick: nextHandler },
      style: { color: "blue" },
      refSwap: { prev: undefined, next: nextRef },
    });

    expect(el.hasAttribute("title")).toBe(false);
    expect(el.id).toBe("new");
    el.click();
    expect(fired).toEqual(["next"]);
    expect(el.style.color).toBe("blue");
    expect(nextRef.current).toBe(el);
  });
});
