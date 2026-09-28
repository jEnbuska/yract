/**
 * DOM side of element props: given props or a patch, the element looks like X.
 * Patch shapes themselves are covered by the diff tests.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { HTML_NS, SVG_NS } from "../../render/elements/namespaces";
import {
  applyElementInitialProps,
  updateElementControlledProps,
  updateElementProps,
} from "../../render/element-props/set-props";
import { untyped } from "../utils/props";
import type { FieldValueMap } from "../../instances/types";

function attached<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("applyElementInitialProps", () => {
  it("writes attributes, mapping className and htmlFor", () => {
    const label = attached("label");
    applyElementInitialProps(label, { id: "a", className: "x y", htmlFor: "f" });
    expect(label.id).toBe("a");
    expect(label.className).toBe("x y");
    expect(label.getAttribute("for")).toBe("f");
  });

  it("writes true as a present attribute and skips false, null and undefined", () => {
    const button = attached("button");
    applyElementInitialProps(
      button,
      untyped({ disabled: true, hidden: false, title: null, lang: undefined }),
    );
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.hasAttribute("hidden")).toBe(false);
    expect(button.hasAttribute("title")).toBe(false);
    expect(button.hasAttribute("lang")).toBe(false);
  });

  it("does not write reserved props as attributes", () => {
    const div = attached("div");
    applyElementInitialProps(div, { key: "k", deps: [1] });
    expect(div.attributes.length).toBe(0);
  });

  it("attaches handlers under their DOM event name", () => {
    const calls: string[] = [];
    const button = attached("button");
    applyElementInitialProps(button, { onClick: () => calls.push("click") });
    button.click();
    expect(calls).toEqual(["click"]);
  });

  it("assigns the style object, custom properties included", () => {
    const div = attached("div");
    applyElementInitialProps(div, { style: { color: "rgb(255, 0, 0)", "--gap": "4px" } });
    expect(div.style.color).toBe("rgb(255, 0, 0)");
    expect(div.style.getPropertyValue("--gap")).toBe("4px");
  });

  it("writes a checkbox's checked as the DOM property, and its value as an attribute", () => {
    const box = attached("input");
    applyElementInitialProps(box, untyped({ type: "checkbox", checked: true, value: "yes" }));
    expect(box.checked).toBe(true);
    expect(box.getAttribute("value")).toBe("yes");
  });

  it("writes value as an attribute on non-form elements", () => {
    const progress = attached("progress");
    applyElementInitialProps(progress, untyped({ max: 100, value: 30 }));
    expect(progress.getAttribute("value")).toBe("30");
    expect(progress.value).toBe(30);
  });

  it("writes value after min and max, so it is not clamped to the defaults", () => {
    const range = attached("input");
    applyElementInitialProps(range, { type: "range", value: "2500", min: "0", max: "5000" });
    expect(range.value).toBe("2500");
  });
});

describe("updateElementProps", () => {
  describe("style", () => {
    it("applies a full style object", () => {
      const el = attached("div");
      updateElementProps(el, {
        ns: HTML_NS,
        style: { color: "rgb(255, 0, 0)", paddingLeft: "4px" },
      });
      expect(el.style.color).toBe("rgb(255, 0, 0)");
      expect(el.style.paddingLeft).toBe("4px");
    });

    it('applies a delta: new values land, "" entries clear', () => {
      const el = attached("div");
      el.style.color = "red";
      el.style.padding = "4px";
      updateElementProps(el, { ns: HTML_NS, style: { color: "blue", padding: "" } });
      expect(el.style.color).toBe("blue");
      expect(el.style.padding).toBe("");
    });

    it("clears all inline styles when style is null", () => {
      const el = attached("div");
      el.style.color = "red";
      el.style.padding = "4px";
      updateElementProps(el, { ns: HTML_NS, style: null });
      expect(el.style.cssText).toBe("");
    });
  });

  describe("attributes", () => {
    it("writes setAttrs entries", () => {
      const el = attached("div");
      updateElementProps(el, {
        ns: HTML_NS,
        setAttrs: { id: "hello", title: "hi", class: "foo bar" },
      });
      expect(el.id).toBe("hello");
      expect(el.getAttribute("title")).toBe("hi");
      expect(el.className).toBe("foo bar");
    });

    it("removes removeAttrs entries", () => {
      const el = attached("label");
      el.setAttribute("title", "bye");
      el.setAttribute("for", "x");
      el.className = "old";
      updateElementProps(el, { ns: HTML_NS, removeAttrs: ["title", "class", "for"] });
      expect(el.attributes.length).toBe(0);
    });

    it("removes before it sets, so a re-added key keeps its new value", () => {
      const el = attached("div");
      el.setAttribute("title", "old");
      updateElementProps(el, { ns: HTML_NS, removeAttrs: ["title"], setAttrs: { title: "new" } });
      expect(el.getAttribute("title")).toBe("new");
    });
  });

  // Event buckets are keyed by DOM event name.
  describe("events", () => {
    it("attaches a handler", () => {
      const calls: string[] = [];
      const el = attached("button");
      updateElementProps(el, { ns: HTML_NS, setEvents: { click: () => calls.push("hit") } });
      el.click();
      expect(calls).toEqual(["hit"]);
    });

    it("detaches a removed handler", () => {
      const calls: string[] = [];
      const el = attached("button");
      updateElementProps(el, { ns: HTML_NS, setEvents: { click: () => calls.push("hit") } });
      updateElementProps(el, { ns: HTML_NS, removeEvents: ["click"] });
      el.click();
      expect(calls).toEqual([]);
    });

    it("re-points one listener when the handler is swapped, instead of stacking", () => {
      const calls: string[] = [];
      const el = attached("button");
      // Inline handlers change identity every render, so this is the common path.
      for (let i = 0; i < 3; i++) {
        updateElementProps(el, { ns: HTML_NS, setEvents: { click: () => calls.push(`h${i}`) } });
      }
      el.click();
      expect(calls).toEqual(["h2"]);
    });

    it("keeps only the new handler when a patch removes and sets the same event", () => {
      const calls: string[] = [];
      const el = attached("button");
      updateElementProps(el, { ns: HTML_NS, setEvents: { click: () => calls.push("prev") } });
      updateElementProps(el, {
        ns: HTML_NS,
        removeEvents: ["click"],
        setEvents: { click: () => calls.push("next") },
      });
      el.click();
      expect(calls).toEqual(["next"]);
    });
  });

  it("applies every bucket of a combined patch", () => {
    const fired: string[] = [];
    const el = attached("div");
    el.setAttribute("title", "old");
    el.style.color = "red";
    updateElementProps(el, { ns: HTML_NS, setEvents: { click: () => fired.push("prev") } });
    updateElementProps(el, {
      ns: HTML_NS,
      removeAttrs: ["title"],
      setAttrs: { id: "new" },
      removeEvents: ["click"],
      setEvents: { click: () => fired.push("next") },
      style: { color: "blue" },
    });
    expect(el.hasAttribute("title")).toBe(false);
    expect(el.id).toBe("new");
    el.click();
    expect(fired).toEqual(["next"]);
    expect(el.style.color).toBe("blue");
  });
});

describe("updateElementControlledProps", () => {
  it("writes a string value and records it as the rendered value", () => {
    const valueMap: FieldValueMap = new WeakMap();
    const input = attached("input");
    updateElementControlledProps(input, "abc", valueMap, new WeakMap());
    expect(input.value).toBe("abc");
    expect(valueMap.get(input)).toBe("abc");
  });

  it("writes a boolean as checked", () => {
    const valueMap: FieldValueMap = new WeakMap();
    const box = attached("input");
    box.type = "checkbox";
    updateElementControlledProps(box, true, valueMap, new WeakMap());
    expect(box.checked).toBe(true);
    expect(valueMap.get(box)).toBe(true);
  });

  it("puts the caret back where the user left it", () => {
    const input = attached("input");
    const selectionMap = new WeakMap([[input, 1]]);
    updateElementControlledProps(input, "abcd", new WeakMap(), selectionMap);
    expect(input.selectionStart).toBe(1);
  });
});

describe("updateElementProps on SVG", () => {
  function svgChild<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    document.body.appendChild(svg);
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    svg.appendChild(el);
    return el;
  }

  it("writes the patch names as given, including SVG 2 href", () => {
    const use = svgChild("use");
    updateElementProps(use, {
      ns: SVG_NS,
      setAttrs: { "stroke-width": "2", viewBox: "0 0 1 1", href: "#a" },
    });
    expect(use.getAttribute("stroke-width")).toBe("2");
    expect(use.getAttribute("viewBox")).toBe("0 0 1 1");
    expect(use.getAttribute("href")).toBe("#a");
    updateElementProps(use, { ns: SVG_NS, removeAttrs: ["href"] });
    expect(use.hasAttribute("href")).toBe(false);
  });

  it("mounts SVG props under their SVG names", () => {
    const circle = svgChild("circle");
    applyElementInitialProps(circle, untyped({ strokeWidth: 3, className: "dot", r: 5 }));
    expect(circle.getAttribute("stroke-width")).toBe("3");
    expect(circle.getAttribute("class")).toBe("dot");
    expect(circle.getAttribute("r")).toBe("5");
  });
});
