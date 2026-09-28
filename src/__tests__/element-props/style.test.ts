import { beforeEach, describe, expect, it } from "vitest";
import { assignStyle, diffStyle } from "../../render/element-props/style";

describe("diffStyle", () => {
  it("emits only the keys whose value changed", () => {
    expect(diffStyle({ color: "red", padding: "4px" }, { color: "blue", padding: "4px" })).toEqual({
      color: "blue",
    });
  });

  it('emits "" for keys that disappeared or became undefined', () => {
    expect(diffStyle({ color: "red", padding: "4px" }, { color: "red" })).toEqual({ padding: "" });
    expect(diffStyle({ color: "red" }, { color: undefined })).toEqual({ color: "" });
  });

  it("treats a prev undefined key as unset, so a value is a plain add", () => {
    expect(diffStyle({ color: undefined }, { color: "red" })).toEqual({ color: "red" });
  });

  it("returns undefined when nothing changed", () => {
    expect(diffStyle({ color: "red" }, { color: "red" })).toBeUndefined();
    expect(diffStyle({ color: undefined }, { color: undefined })).toBeUndefined();
    expect(diffStyle({ padding: "4px" }, { padding: "4px", color: undefined })).toBeUndefined();
  });

  it("ignores keys inherited through the prototype", () => {
    const proto = { inherited: "ghost" };
    const prev = Object.assign(Object.create(proto) as Record<string, unknown>, { color: "red" });
    const next = Object.assign(Object.create(proto) as Record<string, unknown>, { color: "red" });
    expect(diffStyle(prev, next)).toBeUndefined();
  });
});

describe("assignStyle", () => {
  let el: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = "";
    el = document.createElement("div");
    document.body.appendChild(el);
  });

  it("assigns regular properties", () => {
    assignStyle(el, { color: "rgb(255, 0, 0)", paddingLeft: "4px" });
    expect(el.style.color).toBe("rgb(255, 0, 0)");
    expect(el.style.paddingLeft).toBe("4px");
  });

  it("sets custom properties, alone or alongside regular ones", () => {
    assignStyle(el, { "--gap": "4px", color: "rgb(255, 0, 0)" });
    expect(el.style.getPropertyValue("--gap")).toBe("4px");
    expect(el.style.color).toBe("rgb(255, 0, 0)");
  });

  it('clears properties set to ""', () => {
    assignStyle(el, { "--gap": "4px", color: "red" });
    assignStyle(el, { "--gap": "", color: "" });
    expect(el.style.getPropertyValue("--gap")).toBe("");
    expect(el.style.color).toBe("");
  });

  it("applies a shorthand and then its longhand in key order", () => {
    assignStyle(el, { padding: "4px", paddingLeft: "8px" });
    expect(el.style.paddingTop).toBe("4px");
    expect(el.style.paddingLeft).toBe("8px");
  });
});
