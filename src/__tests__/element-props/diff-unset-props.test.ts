import { describe, expect, it } from "vitest";
import { HTML_NS, SVG_NS } from "../../render/elements/namespaces";
import { diffUnsetProps } from "../../render/element-props/diff-unset-props";
import { isReservedValueProp } from "../../render/element-props/utils";
import { untyped } from "../utils/props";

const REF_ATTR = "data-yract-element-ref-id";
const diff = (prev: Record<string, unknown>, next: Record<string, unknown>) =>
  diffUnsetProps(HTML_NS, untyped(prev), untyped(next), isReservedValueProp);

describe("diffUnsetProps", () => {
  describe("attributes", () => {
    it("removes an attribute that next drops", () => {
      expect(diff({ id: "a", title: "hi" }, { id: "a" })).toEqual({
        ns: HTML_NS,
        removeAttrs: ["title"],
      });
    });

    it("removes an attribute that next sets to undefined, null or false", () => {
      for (const unset of [undefined, null, false]) {
        expect(diff({ title: "hi" }, { title: unset })).toEqual({
          ns: HTML_NS,
          removeAttrs: ["title"],
        });
      }
    });

    it("removes a boolean attribute that becomes false", () => {
      expect(diff({ disabled: true }, { disabled: false })).toEqual({
        ns: HTML_NS,
        removeAttrs: ["disabled"],
      });
    });

    it("ignores attributes that stay set", () => {
      expect(diff({ title: "old" }, { title: "new" })).toBeUndefined();
    });

    it("ignores attributes that were not set in prev", () => {
      expect(diff({ title: undefined, hidden: false }, {})).toBeUndefined();
    });

    it("ignores reserved props", () => {
      expect(diff({ key: "k", deps: [1], value: "v" }, {})).toBeUndefined();
    });
  });

  describe("name mapping", () => {
    it("removes class for className and for for htmlFor", () => {
      expect(diff({ className: "a", htmlFor: "x" }, {})).toEqual({
        ns: HTML_NS,
        removeAttrs: ["class", "for"],
      });
    });

    it("removes class and for when they become false", () => {
      expect(diff({ className: "a" }, { className: false })).toEqual({
        ns: HTML_NS,
        removeAttrs: ["class"],
      });
      expect(diff({ htmlFor: "x" }, { htmlFor: false })).toEqual({
        ns: HTML_NS,
        removeAttrs: ["for"],
      });
    });

    it("removes the ref attribute when the ref is dropped", () => {
      expect(diff({ ref: { identifier: "r" } }, {})).toEqual({
        ns: HTML_NS,
        removeAttrs: [REF_ATTR],
      });
    });
  });

  describe("style", () => {
    it("clears all inline styles when style is dropped or undefined", () => {
      expect(diff({ style: { color: "red" } }, {})).toEqual({ ns: HTML_NS, style: null });
      expect(diff({ style: { color: "red" } }, { style: undefined })).toEqual({
        ns: HTML_NS,
        style: null,
      });
    });
  });

  // `removeEvents` is keyed by DOM event name.
  describe("events", () => {
    it("removes a handler that next drops, or sets to undefined or false", () => {
      const onClick = () => {};
      expect(diff({ onClick }, {})).toEqual({ ns: HTML_NS, removeEvents: ["click"] });
      expect(diff({ onClick }, { onClick: undefined })).toEqual({
        ns: HTML_NS,
        removeEvents: ["click"],
      });
      expect(diff({ onClick }, { onClick: false })).toEqual({
        ns: HTML_NS,
        removeEvents: ["click"],
      });
    });

    it("does not remove a handler that is swapped for another function", () => {
      expect(diff({ onClick: () => {} }, { onClick: () => {} })).toBeUndefined();
    });

    it("maps special prop names to their DOM event", () => {
      expect(diff({ onFocus: () => {} }, {})).toEqual({ ns: HTML_NS, removeEvents: ["focusin"] });
    });
  });

  it("collects every kind of removal when next is empty", () => {
    const patch = diff(
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
    expect(diff({ httpEquiv: "refresh", acceptCharset: "utf-8" }, {})).toEqual({
      ns: HTML_NS,
      removeAttrs: ["http-equiv", "accept-charset"],
    });
    expect(
      diffUnsetProps(
        SVG_NS,
        untyped({ strokeWidth: 2, viewBox: "0 0 1 1", href: "#a" }),
        {},
        isReservedValueProp,
      ),
    ).toEqual({ ns: SVG_NS, removeAttrs: ["stroke-width", "viewBox", "href"] });
  });
});
