import { describe, expect, it } from "vitest";
import { HTML_NS, MATHML_NS, SVG_NS } from "../../render/elements/namespaces";
import {
  isFrameworkProp,
  isReservedCheckedProp,
  isReservedValueProp,
  reservedPropsFor,
} from "../../render/element-props/utils";

describe("reservedPropsFor", () => {
  it("reserves value on HTML text inputs, select and textarea", () => {
    expect(reservedPropsFor(HTML_NS, "input", "text")).toBe(isReservedValueProp);
    expect(reservedPropsFor(HTML_NS, "input", undefined)).toBe(isReservedValueProp);
    expect(reservedPropsFor(HTML_NS, "select", undefined)).toBe(isReservedValueProp);
    expect(reservedPropsFor(HTML_NS, "textarea", undefined)).toBe(isReservedValueProp);
  });

  it("reserves checked on HTML checkboxes and radios", () => {
    expect(reservedPropsFor(HTML_NS, "input", "checkbox")).toBe(isReservedCheckedProp);
    expect(reservedPropsFor(HTML_NS, "input", "radio")).toBe(isReservedCheckedProp);
  });

  it("reserves only framework props everywhere else", () => {
    for (const tag of ["progress", "meter", "option", "li", "button", "div"]) {
      expect(reservedPropsFor(HTML_NS, tag, undefined)).toBe(isFrameworkProp);
    }
  });

  it("never controls values outside HTML, even for an element named input", () => {
    expect(reservedPropsFor(SVG_NS, "input", "text")).toBe(isFrameworkProp);
    expect(reservedPropsFor(MATHML_NS, "input", "checkbox")).toBe(isFrameworkProp);
  });
});

describe("reserved-prop predicates", () => {
  it("framework props are key, deps and children", () => {
    for (const key of ["key", "deps", "children"]) expect(isFrameworkProp(key)).toBe(true);
    for (const key of ["value", "checked", "id"]) expect(isFrameworkProp(key)).toBe(false);
  });

  it("the value and checked variants add exactly their controlled prop", () => {
    expect(isReservedValueProp("value")).toBe(true);
    expect(isReservedValueProp("checked")).toBe(false);
    expect(isReservedCheckedProp("checked")).toBe(true);
    expect(isReservedCheckedProp("value")).toBe(false);
    expect(isReservedValueProp("key")).toBe(true);
    expect(isReservedCheckedProp("deps")).toBe(true);
  });
});
