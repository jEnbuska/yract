import { describe, expect, it } from "vitest";
import { HTML_NS, MATHML_NS, SVG_NS } from "../../render/elements/namespaces";
import {
  diffElementProps,
  diffSetProps,
  diffUnsetProps,
} from "../../render/element-props/diff-element-props";
import { untyped } from "../utils/props";

const REF_ATTR = "data-yract-element-ref-id";

/** The removal loop alone, for a text input. */
const diffUnset = (prev: Record<string, unknown>, next: Record<string, unknown>) =>
  diffUnsetProps(HTML_NS, untyped(prev), untyped(next), "value");

/** The write loop alone, for a text input. */
const diffSet = (prev: Record<string, unknown>, next: Record<string, unknown>) =>
  diffSetProps(HTML_NS, untyped(prev), untyped(next), "value", undefined);

describe("diffElementProps", () => {
  describe("no-op", () => {
    it("returns undefined for the same props object without walking it", () => {
      const p = { id: "a", onClick: () => {}, style: { color: "red" } };
      expect(diffElementProps(HTML_NS, { localName: "div" }, p, p)).toBeUndefined();
    });

    it("returns undefined when every value is Object.is-equal", () => {
      expect(
        diffElementProps(HTML_NS, { localName: "div" }, { id: "a" }, { id: "a" }),
      ).toBeUndefined();
      expect(diffElementProps(HTML_NS, { localName: "div" }, {}, {})).toBeUndefined();
    });

    it("returns undefined when a key is undefined on one or both sides", () => {
      expect(
        diffElementProps(HTML_NS, { localName: "div" }, {}, { title: undefined }),
      ).toBeUndefined();
      expect(
        diffElementProps(HTML_NS, { localName: "div" }, { title: undefined }, { title: undefined }),
      ).toBeUndefined();
      expect(
        diffElementProps(
          HTML_NS,
          { localName: "div" },
          { onClick: undefined },
          { onClick: undefined },
        ),
      ).toBeUndefined();
      expect(
        diffElementProps(HTML_NS, { localName: "div" }, { ref: undefined }, { ref: undefined }),
      ).toBeUndefined();
    });
  });

  describe("removals and writes together", () => {
    it("only removes a prop that becomes false, so the element does not keep it", () => {
      expect(
        diffElementProps(HTML_NS, { localName: "div" }, { disabled: true }, { disabled: false }),
      ).toEqual({
        ns: HTML_NS,
        removeAttrs: ["disabled"],
      });
      expect(
        diffElementProps(
          HTML_NS,
          { localName: "div" },
          { className: "a" },
          untyped({ className: false }),
        ),
      ).toEqual({
        ns: HTML_NS,
        removeAttrs: ["class"],
      });
      expect(
        diffElementProps(
          HTML_NS,
          { localName: "div" },
          { htmlFor: "x" },
          untyped({ htmlFor: false }),
        ),
      ).toEqual({
        ns: HTML_NS,
        removeAttrs: ["for"],
      });
    });

    it("removes an attribute that becomes undefined exactly once", () => {
      // BUG: both diff loops push the key, so it is removed twice.
      expect(
        diffElementProps(HTML_NS, { localName: "div" }, { title: "hi" }, { title: undefined }),
      ).toEqual({
        ns: HTML_NS,
        removeAttrs: ["title"],
      });
    });

    it("fills every bucket when all kinds of changes happen at once", () => {
      const nextHandler = () => {};
      const patch = diffElementProps(
        HTML_NS,
        { localName: "div" },
        untyped({
          id: "old",
          title: "will-drop",
          onClick: () => {},
          onKeyDown: () => {},
          style: { color: "red", padding: "4px" },
          ref: { identifier: "a" },
        }),
        untyped({
          id: "new",
          "data-new": "added",
          onClick: nextHandler,
          style: { color: "red", margin: "0" },
          ref: { identifier: "b" },
        }),
      );
      expect(patch).toEqual({
        ns: HTML_NS,
        removeAttrs: ["title"],
        setAttrs: { id: "new", "data-new": "added", "data-yract-element-ref-id": "b" },
        removeEvents: ["keydown"],
        setEvents: { click: nextHandler },
        style: { padding: "", margin: "0" },
      });
    });

    it("emits every set bucket when prev is empty", () => {
      const onClick = () => {};
      const style = { color: "red" };
      expect(
        diffElementProps(
          HTML_NS,
          { localName: "div" },
          {},
          untyped({ id: "a", onClick, style, ref: { identifier: "r" } }),
        ),
      ).toEqual({
        ns: HTML_NS,
        setAttrs: { id: "a", "data-yract-element-ref-id": "r" },
        setEvents: { click: onClick },
        style,
      });
    });
  });
});

describe("diffElementProps: controlled values by tag", () => {
  it("carries an input's value in setControlled, not setAttrs", () => {
    expect(
      diffElementProps(HTML_NS, { localName: "input" }, { value: "a" }, { value: "b" }),
    ).toEqual({
      ns: HTML_NS,
      setControlled: "b",
    });
  });

  it("carries a checkbox's checked in setControlled", () => {
    expect(
      diffElementProps(
        HTML_NS,
        { localName: "input", type: "checkbox" },
        { type: "checkbox", checked: false },
        { type: "checkbox", checked: true },
      ),
    ).toEqual({ ns: HTML_NS, setControlled: true });
  });

  it("controls select and textarea values", () => {
    expect(
      diffElementProps(HTML_NS, { localName: "select" }, { value: "a" }, { value: "b" }),
    ).toEqual({
      ns: HTML_NS,
      setControlled: "b",
    });
    expect(
      diffElementProps(HTML_NS, { localName: "textarea" }, { value: "a" }, { value: "b" }),
    ).toEqual({
      ns: HTML_NS,
      setControlled: "b",
    });
  });

  it("combines setControlled with other changes", () => {
    expect(
      diffElementProps(
        HTML_NS,
        { localName: "input" },
        { value: "a", max: "5" },
        { value: "b", max: "9" },
      ),
    ).toEqual({ ns: HTML_NS, setAttrs: { max: "9" }, setControlled: "b" });
  });

  it("returns undefined when an unchanged value is the only prop", () => {
    expect(
      diffElementProps(HTML_NS, { localName: "input" }, { value: "a" }, { value: "a" }),
    ).toBeUndefined();
  });

  it("writes value as an attribute on other elements (progress, meter, option, li)", () => {
    for (const tag of ["progress", "meter", "option", "li"]) {
      expect(
        diffElementProps(HTML_NS, { localName: tag }, untyped({ value: 1 }), untyped({ value: 2 })),
      ).toEqual({
        ns: HTML_NS,
        setAttrs: { value: "2" },
      });
    }
  });

  describe("controlled value edge cases", () => {
    it("writes a checkbox's value attribute, since only checked is controlled there", () => {
      expect(
        diffElementProps(
          HTML_NS,
          { localName: "input", type: "checkbox" },
          { type: "checkbox", value: "on", checked: true },
          { type: "checkbox", value: "yes", checked: true },
        ),
      ).toEqual({ ns: HTML_NS, setAttrs: { value: "yes" } });
    });

    it("switches to checked control when an input's type changes to checkbox", () => {
      // The old value attribute may also be removed; that is harmless.
      expect(
        diffElementProps(
          HTML_NS,
          { localName: "input", type: "checkbox" },
          { type: "text", value: "a" },
          { type: "checkbox", checked: true },
        ),
      ).toMatchObject({ setAttrs: { type: "checkbox" }, setControlled: true });
    });

    it("switches to value control when an input's type changes away from checkbox", () => {
      // The old checked attribute may also be removed; that is harmless.
      expect(
        diffElementProps(
          HTML_NS,
          { localName: "input" },
          { type: "checkbox", checked: true },
          { type: "text", value: "a" },
        ),
      ).toMatchObject({ setAttrs: { type: "text" }, setControlled: "a" });
    });

    it("makes no patch when value goes from undefined to an empty string", () => {
      expect(diffElementProps(HTML_NS, { localName: "input" }, {}, { value: "" })).toBeUndefined();
    });

    it("numbers and their string form are the same controlled value", () => {
      expect(
        diffElementProps(HTML_NS, { localName: "input" }, { value: 5 }, { value: "5" }),
      ).toBeUndefined();
    });

    it("controls a select's value alongside its other attribute changes", () => {
      expect(
        diffElementProps(
          HTML_NS,
          { localName: "select" },
          { value: "a", disabled: false },
          { value: "b", disabled: true },
        ),
      ).toEqual({ ns: HTML_NS, setAttrs: { disabled: "true" }, setControlled: "b" });
    });

    it("controls a textarea's value alongside its other attribute changes", () => {
      expect(
        diffElementProps(
          HTML_NS,
          { localName: "textarea" },
          { value: "a", rows: 2 },
          { value: "b", rows: 4 },
        ),
      ).toEqual({ ns: HTML_NS, setAttrs: { rows: "4" }, setControlled: "b" });
    });

    it("does not control an <input> that is in the SVG namespace", () => {
      // Outside <foreignObject>, <input> inside <svg> is an unknown SVG element.
      const valuePatch = diffElementProps(
        SVG_NS,
        { localName: "input" },
        untyped({ value: "a" }),
        untyped({ value: "b" }),
      );
      expect(valuePatch?.setControlled).toBeUndefined();
      expect(
        diffElementProps(
          SVG_NS,
          { localName: "input" },
          untyped({ type: "checkbox", checked: false }),
          untyped({ type: "checkbox", checked: true }),
        ),
      ).toEqual({ ns: SVG_NS, setAttrs: { checked: "true" } });
    });

    it("writes value as a plain attribute on non-form elements (SVG <g>)", () => {
      // Same root cause as the <progress>/<li> case above: value is reserved everywhere.
      expect(
        diffElementProps(
          SVG_NS,
          { localName: "g" },
          untyped({ value: "a" }),
          untyped({ value: "b" }),
        ),
      ).toEqual({ ns: SVG_NS, setAttrs: { value: "b" } });
    });
  });
});

describe("diffUnsetProps", () => {
  describe("attributes", () => {
    it("removes an attribute that next drops", () => {
      expect(diffUnset({ id: "a", title: "hi" }, { id: "a" })).toEqual({
        ns: HTML_NS,
        removeAttrs: ["title"],
      });
    });

    it("removes an attribute that next sets to undefined, null or false", () => {
      for (const unset of [undefined, null, false]) {
        expect(diffUnset({ title: "hi" }, { title: unset })).toEqual({
          ns: HTML_NS,
          removeAttrs: ["title"],
        });
      }
    });

    it("removes a boolean attribute that becomes false", () => {
      expect(diffUnset({ disabled: true }, { disabled: false })).toEqual({
        ns: HTML_NS,
        removeAttrs: ["disabled"],
      });
    });

    it("ignores attributes that stay set", () => {
      expect(diffUnset({ title: "old" }, { title: "new" })).toBeUndefined();
    });

    it("ignores attributes that were not set in prev", () => {
      expect(diffUnset({ title: undefined, hidden: false }, {})).toBeUndefined();
    });

    it("ignores reserved props", () => {
      expect(diffUnset({ key: "k", deps: [1], value: "v" }, {})).toBeUndefined();
    });
  });

  describe("name mapping", () => {
    it("removes class for className and for for htmlFor", () => {
      expect(diffUnset({ className: "a", htmlFor: "x" }, {})).toEqual({
        ns: HTML_NS,
        removeAttrs: ["class", "for"],
      });
    });

    it("removes class and for when they become false", () => {
      expect(diffUnset({ className: "a" }, { className: false })).toEqual({
        ns: HTML_NS,
        removeAttrs: ["class"],
      });
      expect(diffUnset({ htmlFor: "x" }, { htmlFor: false })).toEqual({
        ns: HTML_NS,
        removeAttrs: ["for"],
      });
    });

    it("removes the ref attribute when the ref is dropped", () => {
      expect(diffUnset({ ref: { identifier: "r" } }, {})).toEqual({
        ns: HTML_NS,
        removeAttrs: [REF_ATTR],
      });
    });
  });

  describe("style", () => {
    it("clears all inline styles when style is dropped or undefined", () => {
      expect(diffUnset({ style: { color: "red" } }, {})).toEqual({ ns: HTML_NS, style: null });
      expect(diffUnset({ style: { color: "red" } }, { style: undefined })).toEqual({
        ns: HTML_NS,
        style: null,
      });
    });
  });

  // `removeEvents` is keyed by DOM event name.
  describe("events", () => {
    it("removes a handler that next drops, or sets to undefined or false", () => {
      const onClick = () => {};
      expect(diffUnset({ onClick }, {})).toEqual({ ns: HTML_NS, removeEvents: ["click"] });
      expect(diffUnset({ onClick }, { onClick: undefined })).toEqual({
        ns: HTML_NS,
        removeEvents: ["click"],
      });
      expect(diffUnset({ onClick }, { onClick: false })).toEqual({
        ns: HTML_NS,
        removeEvents: ["click"],
      });
    });

    it("does not remove a handler that is swapped for another function", () => {
      expect(diffUnset({ onClick: () => {} }, { onClick: () => {} })).toBeUndefined();
    });

    it("maps special prop names to their DOM event", () => {
      expect(diffUnset({ onFocus: () => {} }, {})).toEqual({
        ns: HTML_NS,
        removeEvents: ["focusin"],
      });
    });
  });

  it("collects every kind of removal when next is empty", () => {
    const patch = diffUnset(
      { id: "a", onClick: () => {}, style: { color: "red" }, ref: { identifier: "r" } },
      {},
    );
    expect(patch).toEqual({
      ns: HTML_NS,
      removeAttrs: ["id", REF_ATTR],
      removeEvents: ["click"],
      style: null,
    });
  });

  it("removes under the same names the write loop uses", () => {
    expect(diffUnset({ httpEquiv: "refresh", acceptCharset: "utf-8" }, {})).toEqual({
      ns: HTML_NS,
      removeAttrs: ["http-equiv", "accept-charset"],
    });
    expect(
      diffUnsetProps(
        SVG_NS,
        untyped({ strokeWidth: 2, viewBox: "0 0 1 1", href: "#a" }),
        {},
        "value",
      ),
    ).toEqual({ ns: SVG_NS, removeAttrs: ["stroke-width", "viewBox", "href"] });
  });
});

describe("diffSetProps", () => {
  describe("attributes", () => {
    it('skips false, which means unset, instead of writing "false"', () => {
      expect(diffSet({ disabled: true }, { disabled: false })).toBeUndefined();
      expect(diffSet({}, { hidden: false })).toBeUndefined();
      expect(diffSet({ className: "a" }, { className: false })).toBeUndefined();
      expect(diffSet({ htmlFor: "x" }, { htmlFor: false })).toBeUndefined();
    });

    it("sets added and changed attributes", () => {
      expect(diffSet({ id: "a" }, { id: "b", title: "hi" })).toEqual({
        ns: HTML_NS,
        setAttrs: { id: "b", title: "hi" },
      });
    });

    it("leaves unchanged attributes out", () => {
      expect(diffSet({ id: "same", title: "old" }, { id: "same", title: "new" })).toEqual({
        ns: HTML_NS,
        setAttrs: { title: "new" },
      });
    });

    it("treats a prev undefined as unset, so a value is a plain add", () => {
      expect(diffSet({ title: undefined }, { title: "hi" })).toEqual({
        ns: HTML_NS,
        setAttrs: { title: "hi" },
      });
    });

    it("skips undefined and null as well as false", () => {
      expect(diffSet({}, { title: undefined, lang: null })).toBeUndefined();
    });

    it("stringifies numbers, including 0 and negative values", () => {
      expect(diffSet({}, { tabIndex: 0, value: 1 })).toEqual({
        ns: HTML_NS,
        setAttrs: { tabIndex: "0" },
      });
      expect(diffSet({}, { tabIndex: -1 })).toEqual({ ns: HTML_NS, setAttrs: { tabIndex: "-1" } });
    });

    it("keeps an empty string as a real value", () => {
      expect(diffSet({}, { download: "" })).toEqual({ ns: HTML_NS, setAttrs: { download: "" } });
    });

    it("stringifies non-string values", () => {
      expect(diffSet({}, { tabIndex: 3 })).toEqual({ ns: HTML_NS, setAttrs: { tabIndex: "3" } });
    });

    it("writes true as an empty boolean attribute", () => {
      expect(diffSet({}, { disabled: true })).toEqual({
        ns: HTML_NS,
        setAttrs: { disabled: "true" },
      });
    });

    it("writes true the same way the initial mount does", () => {
      expect(diffSet({ "aria-expanded": false }, { "aria-expanded": true })).toEqual({
        ns: HTML_NS,
        setAttrs: { "aria-expanded": "true" },
      });
    });

    it("compares with Object.is: NaN is unchanged, -0 differs from +0", () => {
      expect(diffSet({ tabIndex: NaN }, { tabIndex: NaN })).toBeUndefined();
      expect(diffSet({ tabIndex: +0 }, { tabIndex: -0 })).toEqual({
        ns: HTML_NS,
        setAttrs: { tabIndex: "0" },
      });
    });

    it("ignores reserved props", () => {
      expect(diffSet({}, { key: "k", deps: [1], value: "v" })).toBeUndefined();
    });
  });

  describe("name mapping", () => {
    it("writes class for className and for for htmlFor", () => {
      expect(diffSet({}, { className: "a", htmlFor: "x" })).toEqual({
        ns: HTML_NS,
        setAttrs: { class: "a", for: "x" },
      });
    });

    it("writes an empty class when className becomes an empty string", () => {
      expect(diffSet({ className: "a" }, { className: "" })).toEqual({
        ns: HTML_NS,
        setAttrs: { class: "" },
      });
    });

    it("writes the ref's identifier when the ref is added or changed", () => {
      expect(diffSet({}, { ref: { identifier: "b" } })).toEqual({
        ns: HTML_NS,
        setAttrs: { [REF_ATTR]: "b" },
      });
      expect(diffSet({ ref: { identifier: "a" } }, { ref: { identifier: "b" } })).toEqual({
        ns: HTML_NS,
        setAttrs: { [REF_ATTR]: "b" },
      });
    });

    it("ignores a ref that keeps its reference", () => {
      const ref = { identifier: "a" };
      expect(diffSet({ ref }, { ref })).toBeUndefined();
    });
  });

  describe("style", () => {
    it("assigns the whole object when prev style was null or undefined", () => {
      expect(diffSet({ style: null }, { style: { color: "red" } })).toEqual({
        ns: HTML_NS,
        style: { color: "red" },
      });
      expect(diffSet({ style: undefined }, { style: { color: "red" } })).toEqual({
        ns: HTML_NS,
        style: { color: "red" },
      });
    });

    it('clears a removed custom property with ""', () => {
      expect(diffSet({ style: { "--gap": "4px" } }, { style: {} })).toEqual({
        ns: HTML_NS,
        style: { "--gap": "" },
      });
    });

    it("clears every key when the style becomes an empty object", () => {
      expect(diffSet({ style: { color: "red", padding: "4px" } }, { style: {} })).toEqual({
        ns: HTML_NS,
        style: { color: "", padding: "" },
      });
    });

    it("leaves a style that goes away to diffUnsetProps", () => {
      expect(diffSet({ style: { color: "red" } }, { style: undefined })).toBeUndefined();
    });

    it("assigns the whole object when prev had no style", () => {
      expect(diffSet({}, { style: { color: "red" } })).toEqual({
        ns: HTML_NS,
        style: { color: "red" },
      });
    });

    it("emits only the changed keys when both sides have a style object", () => {
      expect(
        diffSet(
          { style: { color: "red", padding: "4px" } },
          { style: { color: "blue", padding: "4px" } },
        ),
      ).toEqual({ ns: HTML_NS, style: { color: "blue" } });
    });

    it("ignores structurally equal style objects", () => {
      expect(diffSet({ style: { color: "red" } }, { style: { color: "red" } })).toBeUndefined();
    });
  });

  // `setEvents` is keyed by DOM event name.
  describe("events", () => {
    it("sets a new or swapped handler", () => {
      const onClick = () => {};
      expect(diffSet({}, { onClick })).toEqual({ ns: HTML_NS, setEvents: { click: onClick } });
      expect(diffSet({ onClick: () => {} }, { onClick })).toEqual({
        ns: HTML_NS,
        setEvents: { click: onClick },
      });
    });

    it("ignores a handler that keeps its reference", () => {
      const onClick = () => {};
      expect(diffSet({ onClick }, { onClick })).toBeUndefined();
    });

    it("ignores non-function values", () => {
      expect(diffSet({}, { onClick: "alert(1)" })).toBeUndefined();
      expect(diffSet({}, { onClick: false })).toBeUndefined();
    });

    it("only treats on + uppercase letter as an event (once, online, onto, onset are attributes)", () => {
      const fn = () => {};
      for (const key of ["once", "online", "onto", "onset"]) {
        const patch = diffSet({}, { [key]: fn });
        expect(patch?.setEvents).toBeUndefined();
        expect(patch?.setAttrs).toHaveProperty(key);
      }
    });
  });

  it("adds to the patch it is given", () => {
    const patch = diffSetProps(HTML_NS, {}, { id: "a" }, "value", {
      ns: HTML_NS,
      removeAttrs: ["title"],
    });
    expect(patch).toEqual({ ns: HTML_NS, removeAttrs: ["title"], setAttrs: { id: "a" } });
  });

  describe("attribute names per namespace", () => {
    it("HTML: maps the four renamed props and leaves the rest as written", () => {
      expect(
        diffSet({}, { httpEquiv: "refresh", acceptCharset: "utf-8", readOnly: true, tabIndex: 1 }),
      ).toEqual({
        ns: HTML_NS,
        setAttrs: {
          "http-equiv": "refresh",
          "accept-charset": "utf-8",
          readOnly: "true",
          tabIndex: "1",
        },
      });
    });

    it("MathML: follows the HTML rules", () => {
      expect(
        diffSetProps(
          MATHML_NS,
          {},
          untyped({ className: "m", displaystyle: "true" }),
          "value",
          undefined,
        ),
      ).toEqual({ ns: MATHML_NS, setAttrs: { class: "m", displaystyle: "true" } });
    });

    it("SVG: kebab-cases and keeps case-sensitive names", () => {
      expect(
        diffSetProps(
          SVG_NS,
          {},
          untyped({
            strokeWidth: 2,
            viewBox: "0 0 10 10",
            href: "#a",
            className: "c",
            "aria-label": "x",
          }),
          "value",
          undefined,
        ),
      ).toEqual({
        ns: SVG_NS,
        setAttrs: {
          "stroke-width": "2",
          viewBox: "0 0 10 10",
          href: "#a",
          class: "c",
          "aria-label": "x",
        },
      });
    });
  });
});
