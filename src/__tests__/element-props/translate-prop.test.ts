import { describe, expect, it } from "vitest";
import { HTML_NS, MATHML_NS, SVG_NS } from "../../render/elements/namespaces";
import {
  propKeyTranslator,
  translateJsxToHtmlPropValue,
} from "../../render/element-props/translate-prop";

const REF_ATTR = "data-yract-element-ref-id";

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

describe("translateJsxToHtmlPropValue", () => {
  it("returns undefined for unset values: undefined, null and false", () => {
    expect(translateJsxToHtmlPropValue("title", undefined)).toBeUndefined();
    expect(translateJsxToHtmlPropValue("title", null)).toBeUndefined();
    expect(translateJsxToHtmlPropValue("disabled", false)).toBeUndefined();
  });

  it('writes true as "true"', () => {
    expect(translateJsxToHtmlPropValue("disabled", true)).toBe("true");
  });

  it("stringifies numbers, including 0 and negative values", () => {
    expect(translateJsxToHtmlPropValue("tabIndex", 0)).toBe("0");
    expect(translateJsxToHtmlPropValue("tabIndex", -1)).toBe("-1");
    expect(translateJsxToHtmlPropValue("maxLength", 1.5)).toBe("1.5");
  });

  it("keeps strings as they are, including the empty string", () => {
    expect(translateJsxToHtmlPropValue("title", "hi")).toBe("hi");
    expect(translateJsxToHtmlPropValue("download", "")).toBe("");
    expect(translateJsxToHtmlPropValue("aria-expanded", "false")).toBe("false");
  });

  it("writes a ref as its identifier", () => {
    expect(translateJsxToHtmlPropValue("ref", { identifier: ":r1:" })).toBe(":r1:");
  });
});
