import { describe, expect, it } from "vitest";
import { diffElementProps } from "../render/element-props";

describe("diffElementProps", () => {
  describe("no-op cases", () => {
    it("returns undefined when prev and next are the same object", () => {
      const p = { id: "a", className: "foo" };
      expect(diffElementProps(p, p)).toBeUndefined();
    });

    it("returns undefined when every key+value is Object.is-equal", () => {
      expect(
        diffElementProps({ id: "a", className: "foo" }, { id: "a", className: "foo" }),
      ).toBeUndefined();
    });

    it("ignores reserved props (key, deps, ref) on both sides", () => {
      expect(
        diffElementProps({ id: "a", key: "k1", deps: [1] }, { id: "a", key: "k2", deps: [2] }),
      ).toBeUndefined();
    });

    it("returns undefined when inline style objects are structurally equal", () => {
      expect(
        diffElementProps(
          { style: { color: "red", padding: "4px" } },
          { style: { color: "red", padding: "4px" } },
        ),
      ).toBeUndefined();
    });
  });

  describe("attribute writes", () => {
    it("collects added and changed plain attrs into setAttrs", () => {
      const patch = diffElementProps({ id: "a" }, { id: "b", title: "hi" });
      expect(patch).toEqual({ setAttrs: { id: "b", title: "hi" } });
    });

    it("collects dropped plain attrs into removeAttrs", () => {
      const patch = diffElementProps({ id: "a", title: "hi" }, { id: "a" });
      expect(patch).toEqual({ removeAttrs: ["title"] });
    });

    it("does not include unchanged attrs", () => {
      const patch = diffElementProps({ id: "same", title: "old" }, { id: "same", title: "new" });
      expect(patch).toEqual({ setAttrs: { title: "new" } });
    });
  });

  // `setEvents` is keyed by DOM event name, `removeEvents` by prop name.
  describe("events", () => {
    it("emits setEvents for a newly added handler", () => {
      const onClick = () => {};
      const patch = diffElementProps({}, { onClick });
      expect(patch).toEqual({ setEvents: { click: onClick } });
    });

    it("emits removeEvents when a handler is dropped", () => {
      const onClick = () => {};
      const patch = diffElementProps({ onClick }, {});
      expect(patch).toEqual({ removeEvents: ["click"] });
    });

    it("emits only setEvents when a handler is swapped (the listener is re-pointed)", () => {
      const prevHandler = () => {};
      const nextHandler = () => {};
      const patch = diffElementProps({ onClick: prevHandler }, { onClick: nextHandler });
      expect(patch).toEqual({ setEvents: { click: nextHandler } });
    });

    it("returns undefined when the same handler reference is reused", () => {
      const onClick = () => {};
      expect(diffElementProps({ onClick }, { onClick })).toBeUndefined();
    });
  });

  describe("style", () => {
    it("assigns a new style object when prev had none", () => {
      const patch = diffElementProps({}, { style: { color: "red" } });
      expect(patch).toEqual({ style: { color: "red" } });
    });

    it("sets style to null when next drops the prop entirely", () => {
      const patch = diffElementProps({ style: { color: "red" } }, {});
      expect(patch).toEqual({ style: null });
    });

    it("sets style to null when next.style is explicitly undefined (== unset)", () => {
      const patch = diffElementProps({ style: { color: "red" } }, { style: undefined });
      expect(patch).toEqual({ style: null });
    });

    it("emits only changed style keys when both sides are objects", () => {
      const patch = diffElementProps(
        { style: { color: "red", padding: "4px" } },
        { style: { color: "blue", padding: "4px" } },
      );
      expect(patch).toEqual({ style: { color: "blue" } });
    });

    it('emits "" for style keys that disappeared', () => {
      const patch = diffElementProps(
        { style: { color: "red", padding: "4px" } },
        { style: { color: "red" } },
      );
      expect(patch).toEqual({ style: { padding: "" } });
    });

    it("returns undefined for identical-but-not-same-reference style objects", () => {
      expect(
        diffElementProps(
          { style: { color: "red", margin: "0" } },
          { style: { color: "red", margin: "0" } },
        ),
      ).toBeUndefined();
    });
  });

  describe("ref", () => {
    const REF_ATTR = "data-yract-element-ref-id";

    it("writes the next ref's identifier when the ref changes", () => {
      const patch = diffElementProps({ ref: { identifier: "a" } }, { ref: { identifier: "b" } });
      expect(patch).toEqual({ setAttrs: { [REF_ATTR]: "b" } });
    });

    it("writes the identifier when a ref is added", () => {
      const patch = diffElementProps({}, { ref: { identifier: "b" } });
      expect(patch).toEqual({ setAttrs: { [REF_ATTR]: "b" } });
    });

    it("removes the attribute when the ref is dropped", () => {
      const patch = diffElementProps({ ref: { identifier: "a" } }, {});
      expect(patch).toEqual({ removeAttrs: [REF_ATTR] });
    });

    it("returns undefined when the same ref reference is reused", () => {
      const ref = { identifier: "a" };
      expect(diffElementProps({ ref }, { ref })).toBeUndefined();
    });
  });

  describe("combined", () => {
    it("produces every bucket at once when all kinds of changes co-occur", () => {
      const prevHandler = () => {};
      const nextHandler = () => {};
      const dropped = () => {};
      const patch = diffElementProps(
        {
          id: "old",
          title: "will-drop",
          onClick: prevHandler,
          onKeyDown: dropped,
          style: { color: "red", padding: "4px" },
          ref: { identifier: "a" },
        },
        {
          id: "new",
          "data-new": "added",
          onClick: nextHandler,
          style: { color: "red", margin: "0" },
          ref: { identifier: "b" },
        },
      );
      expect(patch).toEqual({
        removeAttrs: ["title"],
        setAttrs: { id: "new", "data-new": "added", "data-yract-element-ref-id": "b" },
        removeEvents: ["keydown"],
        setEvents: { click: nextHandler },
        style: { padding: "", margin: "0" },
      });
    });
  });

  describe("unified undefined semantics (attrs)", () => {
    it.fails("treats next[key] = undefined as 'unset' and removes a set prev", () => {
      // BUG: both diff loops push the key, so it is removed twice.
      const patch = diffElementProps({ title: "hi" }, { title: undefined });
      expect(patch).toEqual({ removeAttrs: ["title"] });
    });

    it("returns undefined when next has explicit undefined but prev did not have the key", () => {
      expect(diffElementProps({}, { title: undefined })).toBeUndefined();
    });

    it("returns undefined when both prev and next have undefined for a key", () => {
      expect(diffElementProps({ title: undefined }, { title: undefined })).toBeUndefined();
    });

    it("treats prev[key] = undefined as 'unset' so next[key] = value is a plain add", () => {
      const patch = diffElementProps({ title: undefined }, { title: "hi" });
      expect(patch).toEqual({ setAttrs: { title: "hi" } });
    });
  });

  describe("attribute name mapping", () => {
    it("maps className to class", () => {
      expect(diffElementProps({}, { className: "a" })).toEqual({ setAttrs: { class: "a" } });
      expect(diffElementProps({ className: "a" }, {})).toEqual({ removeAttrs: ["class"] });
    });

    it("maps htmlFor to for", () => {
      expect(diffElementProps({}, { htmlFor: "x" })).toEqual({ setAttrs: { for: "x" } });
      expect(diffElementProps({ htmlFor: "x" }, {})).toEqual({ removeAttrs: ["for"] });
    });

    it("removes class when className becomes false", () => {
      // BUG: the false branch removes the prop name "className", not "class".
      expect(diffElementProps({ className: "a" }, { className: false })).toEqual({
        removeAttrs: ["class"],
      });
    });

    it("removes for when htmlFor becomes false", () => {
      // BUG: the false branch removes the prop name "htmlFor", not "for".
      expect(diffElementProps({ htmlFor: "x" }, { htmlFor: false })).toEqual({
        removeAttrs: ["for"],
      });
    });

    it("clears the class when className becomes an empty string", () => {
      // BUG: `if (next)` skips "", and loop 1 only treats null/undefined as unset.
      expect(diffElementProps({ className: "a" }, { className: "" })).toEqual({
        setAttrs: { class: "" },
      });
    });

    it("stringifies non-string attribute values", () => {
      expect(diffElementProps({}, { tabIndex: 3 })).toEqual({ setAttrs: { tabIndex: "3" } });
    });

    it("writes true as an empty boolean attribute and removes it on false", () => {
      expect(diffElementProps({}, { disabled: true })).toEqual({ setAttrs: { disabled: "" } });
      expect(diffElementProps({ disabled: true }, { disabled: false })).toEqual({
        removeAttrs: ["disabled"],
      });
    });
  });

  describe("unified undefined semantics (events)", () => {
    it("emits removeEvents when a handler becomes undefined", () => {
      const onClick = () => {};
      const patch = diffElementProps({ onClick }, { onClick: undefined });
      expect(patch).toEqual({ removeEvents: ["click"] });
    });

    it("emits removeEvents when a handler becomes false", () => {
      // BUG: loop 1 skips `false`, and loop 2 ignores non-function event values.
      const onClick = () => {};
      const patch = diffElementProps({ onClick }, { onClick: false });
      expect(patch).toEqual({ removeEvents: ["click"] });
    });

    it("emits setEvents when a prev-undefined handler becomes a function", () => {
      const onClick = () => {};
      const patch = diffElementProps({ onClick: undefined }, { onClick });
      expect(patch).toEqual({ setEvents: { click: onClick } });
    });

    it("returns undefined when both prev and next have undefined for an event key", () => {
      expect(diffElementProps({ onClick: undefined }, { onClick: undefined })).toBeUndefined();
    });
  });

  describe("unified undefined semantics (style)", () => {
    it('emits "" when a style key becomes undefined', () => {
      const patch = diffElementProps({ style: { color: "red" } }, { style: { color: undefined } });
      expect(patch).toEqual({ style: { color: "" } });
    });

    it("returns undefined when a style key is undefined on both sides", () => {
      expect(
        diffElementProps({ style: { color: undefined } }, { style: { color: undefined } }),
      ).toBeUndefined();
    });

    it("does not emit a write for a next-style key that is undefined with no prev counterpart", () => {
      const patch = diffElementProps(
        { style: { padding: "4px" } },
        { style: { padding: "4px", color: undefined } },
      );
      expect(patch).toBeUndefined();
    });

    it("treats a prev-undefined style key as unset — next value is a plain add", () => {
      const patch = diffElementProps({ style: { color: undefined } }, { style: { color: "red" } });
      expect(patch).toEqual({ style: { color: "red" } });
    });
  });

  describe("non-function event values", () => {
    it("ignores a string handler instead of registering it", () => {
      expect(diffElementProps({}, { onClick: "alert(1)" })).toBeUndefined();
    });

    it("ignores false as a handler", () => {
      expect(diffElementProps({}, { onClick: false })).toBeUndefined();
    });
  });

  describe("event-key tightening (/^on[A-Z]/)", () => {
    it("does not route `once={fn}` through the event buckets", () => {
      const fn = () => {};
      const patch = diffElementProps({}, { once: fn });
      expect(patch?.setEvents).toBeUndefined();
      expect(patch?.setAttrs).toHaveProperty("once");
    });

    it("does not route `online={fn}` through the event buckets", () => {
      const fn = () => {};
      const patch = diffElementProps({}, { online: fn });
      expect(patch?.setEvents).toBeUndefined();
      expect(patch?.setAttrs).toHaveProperty("online");
    });

    it("does not route `onto={fn}` through the event buckets", () => {
      const fn = () => {};
      const patch = diffElementProps({}, { onto: fn });
      expect(patch?.setEvents).toBeUndefined();
      expect(patch?.setAttrs).toHaveProperty("onto");
    });

    it("does not route `onset={fn}` through the event buckets", () => {
      const fn = () => {};
      const patch = diffElementProps({}, { onset: fn });
      expect(patch?.setEvents).toBeUndefined();
      expect(patch?.setAttrs).toHaveProperty("onset");
    });

    it("does route `onClick={fn}` through the event buckets", () => {
      const fn = () => {};
      const patch = diffElementProps({}, { onClick: fn });
      expect(patch).toEqual({ setEvents: { click: fn } });
    });
  });

  describe("invariants pinned to prevent regressions", () => {
    it("ref undefined → undefined produces no patch", () => {
      expect(diffElementProps({ ref: undefined }, { ref: undefined })).toBeUndefined();
    });

    it("NaN on both sides de-dupes (Object.is-based compare)", () => {
      expect(diffElementProps({ tabIndex: NaN }, { tabIndex: NaN })).toBeUndefined();
    });

    it("+0 vs -0 emits a diff (documented speed trade-off)", () => {
      const patch = diffElementProps({ tabIndex: +0 }, { tabIndex: -0 });
      expect(patch).toEqual({ setAttrs: { tabIndex: "0" } });
    });

    it("all-removed: next = {} emits every prev bucket", () => {
      const onClick = () => {};
      const patch = diffElementProps(
        { id: "a", onClick, style: { color: "red" }, ref: { identifier: "r" } },
        {},
      );
      expect(patch).toEqual({
        removeAttrs: ["id", "data-yract-element-ref-id"],
        removeEvents: ["click"],
        style: null,
      });
    });

    it("all-added: prev = {} emits every next bucket", () => {
      const onClick = () => {};
      const style = { color: "red" };
      const patch = diffElementProps({}, { id: "a", onClick, style, ref: { identifier: "r" } });
      expect(patch).toEqual({
        setAttrs: { id: "a", "data-yract-element-ref-id": "r" },
        setEvents: { click: onClick },
        style,
      });
    });

    it("empty → empty returns undefined", () => {
      expect(diffElementProps({}, {})).toBeUndefined();
    });

    it("prev === next short-circuit returns undefined without walking", () => {
      const p = { id: "a", onClick: () => {}, style: { color: "red" } };
      expect(diffElementProps(p, p)).toBeUndefined();
    });
  });
});
