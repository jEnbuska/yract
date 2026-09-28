import { describe, expect, it } from "vitest";
import { useState } from "yract";
import { flush } from "./utils/flush";
import { byTestId, mount } from "./utils/dom";

describe("scheduler", () => {
  it("keeps running after a component unmounts with a state update pending", async () => {
    let setChild!: (n: number) => unknown;
    let setShown!: (b: boolean) => unknown;
    let setOther!: (n: number) => unknown;
    function* Child() {
      const [n, set] = yield* useState(0);
      setChild = set;
      return <span>{n}</span>;
    }
    function* Parent() {
      const [shown, set] = yield* useState(true);
      const [other, setO] = yield* useState(0);
      setShown = set;
      setOther = setO;
      return (
        <div>
          {shown ? <Child /> : null}
          <b data-testid="other">{other}</b>
        </div>
      );
    }
    const c = await mount(<Parent />);
    void setChild(1);
    void setShown(false);
    await flush();
    void setOther(5);
    await flush();
    expect(byTestId(c, "other").textContent).toBe("5");
  });

  it("batches several updates in one tick into a consistent result", async () => {
    let bump!: () => unknown;
    function* Counter() {
      const [n, set] = yield* useState(0);
      bump = () => set((prev) => prev + 1);
      return <b data-testid="n">{n}</b>;
    }
    const c = await mount(<Counter />);
    for (let i = 0; i < 50; i++) void bump();
    await flush();
    expect(byTestId(c, "n").textContent).toBe("50");
  });

  it("resolves the setter's promise once the update is committed", async () => {
    let set!: (n: number) => Promise<void>;
    function* Counter() {
      const [n, s] = yield* useState(0);
      set = s;
      return <b data-testid="n">{n}</b>;
    }
    const c = await mount(<Counter />);
    await set(3);
    expect(byTestId(c, "n").textContent).toBe("3");
  });
});
