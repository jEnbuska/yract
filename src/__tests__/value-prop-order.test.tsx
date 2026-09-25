import { describe, expect, it } from "vitest";
import { render, useState } from "yract";
import { updateElementProps } from "../render/element-props";

async function flush(t = 8) {
  for (let i = 0; i < t; i++) await Promise.resolve();
}

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

    // Key order puts `value` first, which is what a naive loop would honour.
    updateElementProps(el, { setAttrs: { value: "2500", min: "0", max: "5000" } });

    expect({ value: el.value, max: el.max }).toEqual({ value: "2500", max: "5000" });
  });

  it("update: a later value change still lands", async () => {
    const c = document.createElement("div");
    document.body.appendChild(c);
    let set!: (n: number) => unknown;
    function* F(_p: object) {
      const [v, s] = yield* useState(10);
      set = s;
      return <input data-testid="r" type="range" value={String(v)} min="0" max="5000" />;
    }
    render(<F />, c);
    await flush();
    const el = c.querySelector<HTMLInputElement>('[data-testid="r"]')!;
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
