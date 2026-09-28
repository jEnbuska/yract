/**
 * Props through the whole update path: component rerender → reconciler →
 * diff → patch → commit → DOM. The unit tests cover each step on its own;
 * these check that the steps agree.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { type Child, useElementRef, useState } from "yract";
import { flush } from "../utils/flush";
import { byTestId, mount } from "../utils/dom";

beforeEach(() => {
  document.body.innerHTML = "";
});

/** Mount `view(initial)`; `update(next)` rerenders with new state and waits for the commit. */
async function renderWith<S>(initial: S, view: (state: S) => Child) {
  let setState!: (next: S) => Promise<void>;
  function* Host() {
    const [state, set] = yield* useState<S>(() => initial);
    setState = set;
    return view(state);
  }
  const container = await mount(<Host />);
  return {
    container,
    async update(next: S) {
      void setState(next);
      await flush();
    },
  };
}

describe("attribute names", () => {
  it("sets, changes and removes className as class", async () => {
    const { container, update } = await renderWith<string | undefined>("a", (cls) => (
      <div data-testid="t" className={cls} />
    ));
    const el = byTestId(container, "t");
    expect(el.getAttribute("class")).toBe("a");
    await update("b c");
    expect(el.getAttribute("class")).toBe("b c");
    await update(undefined);
    expect(el.hasAttribute("class")).toBe(false);
    expect(el.hasAttribute("className")).toBe(false);
  });

  it("sets, changes and removes htmlFor as for", async () => {
    const { container, update } = await renderWith<string | undefined>("x", (id) => (
      <label data-testid="t" htmlFor={id} />
    ));
    const el = byTestId(container, "t");
    expect(el.getAttribute("for")).toBe("x");
    await update("y");
    expect(el.getAttribute("for")).toBe("y");
    await update(undefined);
    expect(el.hasAttribute("for")).toBe(false);
  });

  it("writes httpEquiv as http-equiv and acceptCharset as accept-charset", async () => {
    const { container, update } = await renderWith<string | undefined>("refresh", (v) => (
      <div>
        <meta data-testid="meta" httpEquiv={v} />
        <form data-testid="form" acceptCharset={v === undefined ? undefined : "utf-8"} />
      </div>
    ));
    const meta = byTestId(container, "meta");
    const form = byTestId(container, "form");
    expect(meta.getAttribute("http-equiv")).toBe("refresh");
    expect(form.getAttribute("accept-charset")).toBe("utf-8");
    await update("content-type");
    expect(meta.getAttribute("http-equiv")).toBe("content-type");
    await update(undefined);
    expect(meta.hasAttribute("http-equiv")).toBe(false);
    expect(form.hasAttribute("accept-charset")).toBe(false);
  });

  it("writes camelCase HTML props under their lowercase attribute", async () => {
    const { container, update } = await renderWith(1, (n) => (
      <input data-testid="t" tabIndex={n} maxLength={n * 10} value="" onInput={() => {}} />
    ));
    const el = byTestId(container, "t");
    expect(el.getAttribute("tabindex")).toBe("1");
    expect(el.getAttribute("maxlength")).toBe("10");
    await update(2);
    expect(el.getAttribute("tabindex")).toBe("2");
    expect(el.getAttribute("maxlength")).toBe("20");
  });
});

describe("value on non-form elements", () => {
  it("updates <progress> and <meter> values after mount", async () => {
    const { container, update } = await renderWith(10, (n) => (
      <div>
        <progress data-testid="p" max={100} value={n} />
        <meter data-testid="m" min={0} max={100} value={n} />
      </div>
    ));
    const progress = byTestId<HTMLProgressElement>(container, "p");
    const meter = byTestId<HTMLMeterElement>(container, "m");
    expect(progress.value).toBe(10);
    await update(60);
    expect(progress.value).toBe(60);
    expect(meter.value).toBe(60);
  });
});

describe("toggles", () => {
  it("adds, removes and re-adds a boolean attribute", async () => {
    const { container, update } = await renderWith(true, (on) => (
      <button data-testid="t" disabled={on} />
    ));
    const el = byTestId<HTMLButtonElement>(container, "t");
    expect(el.hasAttribute("disabled")).toBe(true);
    expect(el.disabled).toBe(true);
    await update(false);
    expect(el.hasAttribute("disabled")).toBe(false);
    expect(el.disabled).toBe(false);
    await update(true);
    expect(el.disabled).toBe(true);
  });

  it("mounts a toggle that starts false without the attribute", async () => {
    const { container, update } = await renderWith(false, (on) => (
      <details data-testid="t" open={on} hidden={on} />
    ));
    const el = byTestId(container, "t");
    expect(el.hasAttribute("open")).toBe(false);
    expect(el.hasAttribute("hidden")).toBe(false);
    await update(true);
    expect(el.hasAttribute("open")).toBe(true);
    expect(el.hasAttribute("hidden")).toBe(true);
  });
});

describe("enumerated attributes", () => {
  it('keeps "false" written instead of removing the attribute', async () => {
    const { container, update } = await renderWith<"true" | "false" | undefined>("true", (v) => (
      <button data-testid="t" aria-expanded={v} draggable={v} spellCheck={v} />
    ));
    const el = byTestId(container, "t");
    expect(el.getAttribute("aria-expanded")).toBe("true");
    await update("false");
    expect(el.getAttribute("aria-expanded")).toBe("false");
    expect(el.getAttribute("draggable")).toBe("false");
    expect(el.getAttribute("spellcheck")).toBe("false");
    await update(undefined);
    expect(el.hasAttribute("aria-expanded")).toBe(false);
    expect(el.hasAttribute("draggable")).toBe(false);
  });

  it("writes data-* values as strings and removes them when undefined", async () => {
    const { container, update } = await renderWith<number | undefined>(1, (n) => (
      <div data-testid="t" data-count={n} />
    ));
    const el = byTestId(container, "t");
    expect(el.dataset["count"]).toBe("1");
    await update(2);
    expect(el.dataset["count"]).toBe("2");
    await update(undefined);
    expect("count" in el.dataset).toBe(false);
  });
});

describe("style", () => {
  type Style = Record<string, string | undefined> | undefined;

  it("adds, changes and removes individual keys", async () => {
    const { container, update } = await renderWith<Style>({ color: "red", padding: "4px" }, (s) => (
      <div data-testid="t" style={s} />
    ));
    const el = byTestId(container, "t");
    expect(el.style.color).toBe("red");
    await update({ color: "blue", padding: "4px", margin: "1px" });
    expect(el.style.color).toBe("blue");
    expect(el.style.margin).toBe("1px");
    await update({ color: "blue" });
    expect(el.style.padding).toBe("");
    expect(el.style.margin).toBe("");
    expect(el.style.color).toBe("blue");
  });

  it("clears every inline style when the prop goes away, and restores it", async () => {
    const { container, update } = await renderWith<Style>({ color: "red" }, (s) => (
      <div data-testid="t" style={s} />
    ));
    const el = byTestId(container, "t");
    await update(undefined);
    expect(el.style.cssText).toBe("");
    await update({ color: "green" });
    expect(el.style.color).toBe("green");
  });

  it("clears every key when the style becomes an empty object", async () => {
    const { container, update } = await renderWith<Style>({ color: "red", padding: "4px" }, (s) => (
      <div data-testid="t" style={s} />
    ));
    const el = byTestId(container, "t");
    await update({});
    expect(el.style.cssText).toBe("");
  });

  it("sets, changes and removes CSS custom properties", async () => {
    const { container, update } = await renderWith<Style>({ "--gap": "4px" }, (s) => (
      <div data-testid="t" style={s} />
    ));
    const el = byTestId(container, "t");
    expect(el.style.getPropertyValue("--gap")).toBe("4px");
    await update({ "--gap": "8px" });
    expect(el.style.getPropertyValue("--gap")).toBe("8px");
    await update({});
    expect(el.style.getPropertyValue("--gap")).toBe("");
  });
});

describe("events", () => {
  it("adds a handler after mount, swaps it, and removes it", async () => {
    const calls: string[] = [];
    const { container, update } = await renderWith<"none" | "a" | "b">("none", (which) => (
      <button data-testid="t" onClick={which === "none" ? undefined : () => calls.push(which)} />
    ));
    const el = byTestId<HTMLButtonElement>(container, "t");
    el.click();
    await update("a");
    el.click();
    await update("b");
    el.click();
    await update("none");
    el.click();
    expect(calls).toEqual(["a", "b"]);
  });
});

describe("ref", () => {
  it("tags the element while the ref is passed and untags it when dropped", async () => {
    let current: () => Element | undefined = () => undefined;
    let setAttached!: (on: boolean) => Promise<void>;
    function* WithRef() {
      const ref = yield* useElementRef<HTMLDivElement>();
      const [attached, set] = yield* useState(true);
      setAttached = set;
      current = () => ref.current;
      return <div data-testid="t" ref={attached ? ref : undefined} />;
    }
    const container = await mount(<WithRef />);
    const el = byTestId(container, "t");
    expect(current()).toBe(el);
    void setAttached(false);
    await flush();
    expect(current()).toBeUndefined();
    expect(el.hasAttribute("data-yract-element-ref-id")).toBe(false);
  });
});

describe("SVG", () => {
  it("writes SVG 2 names at mount and across updates", async () => {
    const { container, update } = await renderWith(2, (w) => (
      <svg viewBox={`0 0 ${w * 10} 10`}>
        <circle data-testid="c" strokeWidth={w} className={`w${w}`} r={5} />
        <use data-testid="u" href={`#s${w}`} />
      </svg>
    ));
    const circle = byTestId(container, "c");
    const use = byTestId(container, "u");
    const svg = circle.parentElement!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 20 10");
    expect(circle.getAttribute("stroke-width")).toBe("2");
    expect(circle.getAttribute("class")).toBe("w2");
    expect(use.getAttribute("href")).toBe("#s2");
    await update(3);
    expect(svg.getAttribute("viewBox")).toBe("0 0 30 10");
    expect(circle.getAttribute("stroke-width")).toBe("3");
    expect(circle.getAttribute("class")).toBe("w3");
    expect(use.getAttribute("href")).toBe("#s3");
  });
});
