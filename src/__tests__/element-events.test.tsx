import { describe, expect, it } from "vitest";
import { useState } from "yract";
import { flush } from "./utils/flush";
import { byTestId, mount } from "./utils/dom";

describe("element events", () => {
  it("calls the handler from the latest render, not a stale closure", async () => {
    function* Counter() {
      const [count, setCount] = yield* useState(0);
      return (
        <button data-testid="b" onClick={() => void setCount(count + 1)}>
          {count}
        </button>
      );
    }
    const c = await mount(<Counter />);
    const b = byTestId<HTMLButtonElement>(c, "b");
    for (let i = 0; i < 3; i++) {
      b.click();
      await flush();
    }
    expect(b.textContent).toBe("3");
  });

  it("starts calling a handler that is added after mount", async () => {
    let enable!: () => unknown;
    const calls: string[] = [];
    function* Late() {
      const [on, setOn] = yield* useState(false);
      enable = () => setOn(true);
      return <button data-testid="b" onClick={on ? () => calls.push("hit") : undefined} />;
    }
    const c = await mount(<Late />);
    void enable();
    await flush();
    byTestId<HTMLButtonElement>(c, "b").click();
    expect(calls).toEqual(["hit"]);
  });

  it("stops calling a handler that is removed", async () => {
    let disable!: () => unknown;
    const calls: string[] = [];
    function* Early() {
      const [on, setOn] = yield* useState(true);
      disable = () => setOn(false);
      return <button data-testid="b" onClick={on ? () => calls.push("hit") : undefined} />;
    }
    const c = await mount(<Early />);
    void disable();
    await flush();
    byTestId<HTMLButtonElement>(c, "b").click();
    expect(calls).toEqual([]);
  });

  it("listens to dblclick for the typed onDblclick prop", async () => {
    const calls: string[] = [];
    const c = await mount(<div data-testid="d" onDblclick={() => calls.push("dbl")} />);
    byTestId(c, "d").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(calls).toEqual(["dbl"]);
  });
});
