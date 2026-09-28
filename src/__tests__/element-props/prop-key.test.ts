import { describe, expect, it } from "vitest";
import { HTML_NS, MATHML_NS, SVG_NS } from "../../render/elements/namespaces";
import {
  isEventKey,
  isFrameworkProp,
  isReservedCheckedProp,
  isReservedValueProp,
  propKeyTranslator,
  REF_ATTR,
  reservedPropsFor,
} from "../../render/element-props/prop-key";

describe("propKeyTranslator", () => {
  describe("HTML", () => {
    const key = propKeyTranslator(HTML_NS);

    it("renames the props whose attribute is not their lowercase name", () => {
      expect(key("className")).toBe("class");
      expect(key("htmlFor")).toBe("for");
      expect(key("acceptCharset")).toBe("accept-charset");
      expect(key("httpEquiv")).toBe("http-equiv");
      expect(key("ref")).toBe(REF_ATTR);
    });

    it("passes every other name through unchanged (setAttribute lowercases HTML names)", () => {
      for (const name of ["id", "readOnly", "tabIndex", "aria-label", "data-x", "viewBox"]) {
        expect(key(name)).toBe(name);
      }
    });
  });

  describe("MathML", () => {
    it("uses the HTML rules", () => {
      expect(propKeyTranslator(MATHML_NS)).toBe(propKeyTranslator(HTML_NS));
    });
  });

  describe("SVG", () => {
    const key = propKeyTranslator(SVG_NS);

    it("kebab-cases camelCase props", () => {
      expect(key("strokeWidth")).toBe("stroke-width");
      expect(key("textAnchor")).toBe("text-anchor");
      expect(key("fillOpacity")).toBe("fill-opacity");
    });

    it("keeps the case-sensitive SVG names as written", () => {
      for (const name of ["viewBox", "preserveAspectRatio", "gradientUnits", "stdDeviation"]) {
        expect(key(name)).toBe(name);
      }
    });

    it("uses the SVG 2 href, with no XLink handling", () => {
      expect(key("href")).toBe("href");
      // Not special any more: an xlinkHref prop is just kebab-cased like any other.
      expect(key("xlinkHref")).toBe("xlink-href");
    });

    it("maps className and ref like HTML", () => {
      expect(key("className")).toBe("class");
      expect(key("ref")).toBe(REF_ATTR);
    });

    it("leaves lowercase and hyphenated names alone", () => {
      for (const name of ["r", "cx", "fill", "aria-label", "data-x"]) {
        expect(key(name)).toBe(name);
      }
    });
  });
});

describe("isEventKey", () => {
  it("accepts on + an uppercase letter", () => {
    for (const key of ["onClick", "onInput", "onDblclick", "onX"]) {
      expect(isEventKey(key)).toBe(true);
    }
  });

  it("rejects attributes that merely start with on", () => {
    for (const key of ["on", "once", "online", "onto", "onset", "open", "onclick"]) {
      expect(isEventKey(key)).toBe(false);
    }
  });
});

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
