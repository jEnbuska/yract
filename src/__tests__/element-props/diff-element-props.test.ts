import { describe, expect, it } from "vitest";
import { HTML_NS, SVG_NS } from "../../render/elements/namespaces";
import { diffElementProps } from "../../render/element-props/diff-element-props";
import { untyped } from "../utils/props";

describe("diffElementProps", () => {
  describe("no-op", () => {
    it("returns undefined for the same props object without walking it", () => {
      const p = { id: "a", onClick: () => {}, style: { color: "red" } };
      expect(diffElementProps(HTML_NS, "div", p, p)).toBeUndefined();
    });

    it("returns undefined when every value is Object.is-equal", () => {
      expect(diffElementProps(HTML_NS, "div", { id: "a" }, { id: "a" })).toBeUndefined();
      expect(diffElementProps(HTML_NS, "div", {}, {})).toBeUndefined();
    });

    it("returns undefined when a key is undefined on one or both sides", () => {
      expect(diffElementProps(HTML_NS, "div", {}, { title: undefined })).toBeUndefined();
      expect(
        diffElementProps(HTML_NS, "div", { title: undefined }, { title: undefined }),
      ).toBeUndefined();
      expect(
        diffElementProps(HTML_NS, "div", { onClick: undefined }, { onClick: undefined }),
      ).toBeUndefined();
      expect(
        diffElementProps(HTML_NS, "div", { ref: undefined }, { ref: undefined }),
      ).toBeUndefined();
    });
  });

  describe("removals and writes together", () => {
    it("only removes a prop that becomes false, so the element does not keep it", () => {
      expect(diffElementProps(HTML_NS, "div", { disabled: true }, { disabled: false })).toEqual({
        ns: HTML_NS,
        removeAttrs: ["disabled"],
      });
      expect(
        diffElementProps(HTML_NS, "div", { className: "a" }, untyped({ className: false })),
      ).toEqual({
        ns: HTML_NS,
        removeAttrs: ["class"],
      });
      expect(
        diffElementProps(HTML_NS, "div", { htmlFor: "x" }, untyped({ htmlFor: false })),
      ).toEqual({
        ns: HTML_NS,
        removeAttrs: ["for"],
      });
    });

    it("removes an attribute that becomes undefined exactly once", () => {
      // BUG: both diff loops push the key, so it is removed twice.
      expect(diffElementProps(HTML_NS, "div", { title: "hi" }, { title: undefined })).toEqual({
        ns: HTML_NS,
        removeAttrs: ["title"],
      });
    });

    it("fills every bucket when all kinds of changes happen at once", () => {
      const nextHandler = () => {};
      const patch = diffElementProps(
        HTML_NS,
        "div",
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
          "div",
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
    expect(diffElementProps(HTML_NS, "input", { value: "a" }, { value: "b" })).toEqual({
      ns: HTML_NS,
      setControlled: "b",
    });
  });

  it("carries a checkbox's checked in setControlled", () => {
    expect(
      diffElementProps(
        HTML_NS,
        "input",
        { type: "checkbox", checked: false },
        { type: "checkbox", checked: true },
      ),
    ).toEqual({ ns: HTML_NS, setControlled: true });
  });

  it("controls select and textarea values", () => {
    expect(diffElementProps(HTML_NS, "select", { value: "a" }, { value: "b" })).toEqual({
      ns: HTML_NS,
      setControlled: "b",
    });
    expect(diffElementProps(HTML_NS, "textarea", { value: "a" }, { value: "b" })).toEqual({
      ns: HTML_NS,
      setControlled: "b",
    });
  });

  it("combines setControlled with other changes", () => {
    expect(
      diffElementProps(HTML_NS, "input", { value: "a", max: "5" }, { value: "b", max: "9" }),
    ).toEqual({ ns: HTML_NS, setAttrs: { max: "9" }, setControlled: "b" });
  });

  it("returns undefined when an unchanged value is the only prop", () => {
    expect(diffElementProps(HTML_NS, "input", { value: "a" }, { value: "a" })).toBeUndefined();
  });

  it("writes value as an attribute on other elements (progress, meter, option, li)", () => {
    for (const tag of ["progress", "meter", "option", "li"]) {
      expect(diffElementProps(HTML_NS, tag, untyped({ value: 1 }), untyped({ value: 2 }))).toEqual({
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
          "input",
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
          "input",
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
          "input",
          { type: "checkbox", checked: true },
          { type: "text", value: "a" },
        ),
      ).toMatchObject({ setAttrs: { type: "text" }, setControlled: "a" });
    });

    it("makes no patch when value goes from undefined to an empty string", () => {
      expect(diffElementProps(HTML_NS, "input", {}, { value: "" })).toBeUndefined();
    });

    it("numbers and their string form are the same controlled value", () => {
      expect(diffElementProps(HTML_NS, "input", { value: 5 }, { value: "5" })).toBeUndefined();
    });

    it("controls a select's value alongside its other attribute changes", () => {
      expect(
        diffElementProps(
          HTML_NS,
          "select",
          { value: "a", disabled: false },
          { value: "b", disabled: true },
        ),
      ).toEqual({ ns: HTML_NS, setAttrs: { disabled: "true" }, setControlled: "b" });
    });

    it("controls a textarea's value alongside its other attribute changes", () => {
      expect(
        diffElementProps(HTML_NS, "textarea", { value: "a", rows: 2 }, { value: "b", rows: 4 }),
      ).toEqual({ ns: HTML_NS, setAttrs: { rows: "4" }, setControlled: "b" });
    });

    it("does not control an <input> that is in the SVG namespace", () => {
      // Outside <foreignObject>, <input> inside <svg> is an unknown SVG element.
      const valuePatch = diffElementProps(
        SVG_NS,
        "input",
        untyped({ value: "a" }),
        untyped({ value: "b" }),
      );
      expect(valuePatch?.setControlled).toBeUndefined();
      expect(
        diffElementProps(
          SVG_NS,
          "input",
          untyped({ type: "checkbox", checked: false }),
          untyped({ type: "checkbox", checked: true }),
        ),
      ).toEqual({ ns: SVG_NS, setAttrs: { checked: "true" } });
    });

    it("writes value as a plain attribute on non-form elements (SVG <g>)", () => {
      // Same root cause as the <progress>/<li> case above: value is reserved everywhere.
      expect(
        diffElementProps(SVG_NS, "g", untyped({ value: "a" }), untyped({ value: "b" })),
      ).toEqual({ ns: SVG_NS, setAttrs: { value: "b" } });
    });
  });
});
