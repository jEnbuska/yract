import { describe, expect, it } from "vitest";
import { render, useState } from "yract";
import { flush } from "./utils/flush";
import { HTML_NS } from "../render/elements/namespaces";
import { byTestId, mount } from "./utils/dom";
import {
  updateElementControlledProps,
  updateElementProps,
} from "../render/element-props/set-props";

describe("value/checked are written after every other prop", () => {
  it("mount: a range input keeps its value when value precedes min/max in JSX", async () => {
    const c = document.createElement("div");
    document.body.appendChild(c);
    render(<input data-testid="r" type="range" value="2500" min="0" max="5000" step="1" />, c);
    await flush();
    const el = c.querySelector<HTMLInputElement>('[data-testid="r"]')!;
    expect({ value: el.value, min: el.min, max: el.max }).toEqual({
      value: "2500",
      min: "0",
      max: "5000",
    });
  });

  it("commit: a patch widening the range applies value against the new bounds", () => {
    const el = document.createElement("input");
    el.type = "range";
    document.body.appendChild(el);

    // The diff carries `value` in `setControlled`, and commit writes it after
    // the attributes, so it is clamped against the new bounds, not the old ones.
    updateElementProps(el, {
      ns: HTML_NS,
      setAttrs: { min: "0", max: "5000" },
      setControlled: "2500",
    });
    updateElementControlledProps(el, "2500", new WeakMap(), new WeakMap());

    expect({ value: el.value, max: el.max }).toEqual({ value: "2500", max: "5000" });
  });

  it("update: a later value change still lands", async () => {
    let set!: (n: number) => unknown;
    function* F(_p: object) {
      const [v, s] = yield* useState(10);
      set = s;
      return <input data-testid="r" type="range" value={String(v)} min="0" max="5000" />;
    }
    const host = await mount(<F />);
    const el = byTestId<HTMLInputElement>(host, "r");
    expect(el.value).toBe("10");
    void set(4321);
    await flush();
    expect(el.value).toBe("4321");
  });

  it("mount: a select selects the option matching value, not the first one", async () => {
    const c = document.createElement("div");
    document.body.appendChild(c);
    render(
      <select data-testid="s" value="c">
        <option value="a">A</option>
        <option value="b">B</option>
        <option value="c">C</option>
      </select>,
      c,
    );
    await flush();
    const el = c.querySelector<HTMLSelectElement>('[data-testid="s"]')!;
    expect({ value: el.value, index: el.selectedIndex }).toEqual({ value: "c", index: 2 });
  });
});
