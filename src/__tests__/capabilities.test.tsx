import { describe, expect, it } from "vitest";
import { createContext, useState, withContext, withRerender, withReturn } from "yract";
import { flush } from "./utils/flush";
import { byTestId, mount } from "./utils/dom";

describe("capabilities", () => {
  it("withReturn ends the render early with the given child", async () => {
    function* Gate(props: { open: boolean }) {
      if (!props.open) yield* withReturn(<i data-testid="out">closed</i>);
      return <b data-testid="out">open</b>;
    }
    const c = await mount(<Gate open={false} />);
    expect(byTestId(c, "out").textContent).toBe("closed");
  });

  it("withRerender returns a callback that rerenders the component", async () => {
    let rerender!: () => void;
    let renders = 0;
    function* Counter() {
      rerender = yield* withRerender();
      renders++;
      return <b data-testid="n">{renders}</b>;
    }
    const c = await mount(<Counter />);
    rerender();
    await flush();
    expect(byTestId(c, "n").textContent).toBe("2");
  });

  it("capabilities can be called conditionally without disturbing hook order", async () => {
    let toggle!: () => unknown;
    function* Mixed() {
      const [flag, setFlag] = yield* useState(false);
      toggle = () => setFlag((f) => !f);
      if (flag) yield* withRerender();
      const [label] = yield* useState("stable");
      return <b data-testid="l">{label}</b>;
    }
    const c = await mount(<Mixed />);
    void toggle();
    await flush();
    expect(byTestId(c, "l").textContent).toBe("stable");
  });

  it("withContext reads the provided value", async () => {
    const Theme = createContext("light", "Theme");
    function* Badge() {
      const theme = yield* withContext(Theme);
      return <b data-testid="t">{String(theme)}</b>;
    }
    const c = await mount(
      <Theme value="dark">
        <Badge />
      </Theme>,
    );
    expect(byTestId(c, "t").textContent).toBe("dark");
  });

  it("withContext falls back to the default without a provider", async () => {
    const Theme = createContext("light", "Theme");
    function* Badge() {
      const theme = yield* withContext(Theme);
      return <b data-testid="t">{String(theme)}</b>;
    }
    const c = await mount(<Badge />);
    expect(byTestId(c, "t").textContent).toBe("light");
  });
});
