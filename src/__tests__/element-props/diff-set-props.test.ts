import { describe, expect, it } from "vitest";
import { HTML_NS, MATHML_NS, SVG_NS } from "../../render/elements/namespaces";
import { diffSetProps } from "../../render/element-props/diff-set-props";
import { isReservedProp } from "../../render/element-props/utils";
import { untyped } from "../utils/props";

const REF_ATTR = "data-yract-element-ref-id";
const diff = (prev: Record<string, unknown>, next: Record<string, unknown>) =>
  diffSetProps(HTML_NS, untyped(prev), untyped(next), isReservedProp, undefined);

describe("diffSetProps", () => {
  describe("attributes", () => {
    it('skips false, which means unset, instead of writing "false"', () => {
      expect(diff({ disabled: true }, { disabled: false })).toBeUndefined();
      expect(diff({}, { hidden: false })).toBeUndefined();
      expect(diff({ className: "a" }, { className: false })).toBeUndefined();
      expect(diff({ htmlFor: "x" }, { htmlFor: false })).toBeUndefined();
    });

    it("sets added and changed attributes", () => {
      expect(diff({ id: "a" }, { id: "b", title: "hi" })).toEqual({
        ns: HTML_NS,
        setAttrs: { id: "b", title: "hi" },
      });
    });

    it("leaves unchanged attributes out", () => {
      expect(diff({ id: "same", title: "old" }, { id: "same", title: "new" })).toEqual({
        ns: HTML_NS,
        setAttrs: { title: "new" },
      });
    });

    it("treats a prev undefined as unset, so a value is a plain add", () => {
      expect(diff({ title: undefined }, { title: "hi" })).toEqual({
        ns: HTML_NS,
        setAttrs: { title: "hi" },
      });
    });

    it("stringifies non-string values", () => {
      expect(diff({}, { tabIndex: 3 })).toEqual({ ns: HTML_NS, setAttrs: { tabIndex: "3" } });
    });

    it("writes true as an empty boolean attribute", () => {
      expect(diff({}, { disabled: true })).toEqual({ ns: HTML_NS, setAttrs: { disabled: "true" } });
    });

    it("writes true the same way the initial mount does", () => {
      expect(diff({ "aria-expanded": false }, { "aria-expanded": true })).toEqual({
        ns: HTML_NS,
        setAttrs: { "aria-expanded": "true" },
      });
    });

    it("compares with Object.is: NaN is unchanged, -0 differs from +0", () => {
      expect(diff({ tabIndex: NaN }, { tabIndex: NaN })).toBeUndefined();
      expect(diff({ tabIndex: +0 }, { tabIndex: -0 })).toEqual({
        ns: HTML_NS,
        setAttrs: { tabIndex: "0" },
      });
    });

    it("ignores reserved props", () => {
      expect(diff({}, { key: "k", deps: [1], value: "v" })).toBeUndefined();
    });
  });

  describe("name mapping", () => {
    it("writes class for className and for for htmlFor", () => {
      expect(diff({}, { className: "a", htmlFor: "x" })).toEqual({
        ns: HTML_NS,
        setAttrs: { class: "a", for: "x" },
      });
    });

    it("writes an empty class when className becomes an empty string", () => {
      expect(diff({ className: "a" }, { className: "" })).toEqual({
        ns: HTML_NS,
        setAttrs: { class: "" },
      });
    });

    it("writes the ref's identifier when the ref is added or changed", () => {
      expect(diff({}, { ref: { identifier: "b" } })).toEqual({
        ns: HTML_NS,
        setAttrs: { [REF_ATTR]: "b" },
      });
      expect(diff({ ref: { identifier: "a" } }, { ref: { identifier: "b" } })).toEqual({
        ns: HTML_NS,
        setAttrs: { [REF_ATTR]: "b" },
      });
    });

    it("ignores a ref that keeps its reference", () => {
      const ref = { identifier: "a" };
      expect(diff({ ref }, { ref })).toBeUndefined();
    });
  });

  describe("style", () => {
    it("assigns the whole object when prev style was null or undefined", () => {
      expect(diff({ style: null }, { style: { color: "red" } })).toEqual({
        ns: HTML_NS,
        style: { color: "red" },
      });
      expect(diff({ style: undefined }, { style: { color: "red" } })).toEqual({
        ns: HTML_NS,
        style: { color: "red" },
      });
    });

    it('clears a removed custom property with ""', () => {
      expect(diff({ style: { "--gap": "4px" } }, { style: {} })).toEqual({
        ns: HTML_NS,
        style: { "--gap": "" },
      });
    });

    it("clears every key when the style becomes an empty object", () => {
      expect(diff({ style: { color: "red", padding: "4px" } }, { style: {} })).toEqual({
        ns: HTML_NS,
        style: { color: "", padding: "" },
      });
    });

    it("leaves a style that goes away to diffUnsetProps", () => {
      expect(diff({ style: { color: "red" } }, { style: undefined })).toBeUndefined();
    });

    it("assigns the whole object when prev had no style", () => {
      expect(diff({}, { style: { color: "red" } })).toEqual({
        ns: HTML_NS,
        style: { color: "red" },
      });
    });

    it("emits only the changed keys when both sides have a style object", () => {
      expect(
        diff(
          { style: { color: "red", padding: "4px" } },
          { style: { color: "blue", padding: "4px" } },
        ),
      ).toEqual({ ns: HTML_NS, style: { color: "blue" } });
    });

    it("ignores structurally equal style objects", () => {
      expect(diff({ style: { color: "red" } }, { style: { color: "red" } })).toBeUndefined();
    });
  });

  // `setEvents` is keyed by DOM event name.
  describe("events", () => {
    it("sets a new or swapped handler", () => {
      const onClick = () => {};
      expect(diff({}, { onClick })).toEqual({ ns: HTML_NS, setEvents: { click: onClick } });
      expect(diff({ onClick: () => {} }, { onClick })).toEqual({
        ns: HTML_NS,
        setEvents: { click: onClick },
      });
    });

    it("ignores a handler that keeps its reference", () => {
      const onClick = () => {};
      expect(diff({ onClick }, { onClick })).toBeUndefined();
    });

    it("ignores non-function values", () => {
      expect(diff({}, { onClick: "alert(1)" })).toBeUndefined();
      expect(diff({}, { onClick: false })).toBeUndefined();
    });

    it("only treats on + uppercase letter as an event (once, online, onto, onset are attributes)", () => {
      const fn = () => {};
      for (const key of ["once", "online", "onto", "onset"]) {
        const patch = diff({}, { [key]: fn });
        expect(patch?.setEvents).toBeUndefined();
        expect(patch?.setAttrs).toHaveProperty(key);
      }
    });
  });

  it("adds to the patch it is given", () => {
    const patch = diffSetProps(HTML_NS, {}, { id: "a" }, isReservedProp, {
      ns: HTML_NS,
      removeAttrs: ["title"],
    });
    expect(patch).toEqual({ ns: HTML_NS, removeAttrs: ["title"], setAttrs: { id: "a" } });
  });

  describe("attribute names per namespace", () => {
    it("HTML: maps the four renamed props and leaves the rest as written", () => {
      expect(
        diff({}, { httpEquiv: "refresh", acceptCharset: "utf-8", readOnly: true, tabIndex: 1 }),
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
          isReservedProp,
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
          isReservedProp,
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
