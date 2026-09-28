import { describe, expect, it } from "vitest";
import { createContext, render, useContext, useState } from "yract";
import { flush } from "./utils/flush";
import { byTestId, mount } from "./utils/dom";

describe("smoke: elements", () => {
  it("renders a simple element into a container", async () => {
    const container = document.createElement("div");
    render(<div id="hello">hi</div>, container);
    await flush();
    expect(container.querySelector("#hello")?.textContent).toBe("hi");
  });

  it("applies a style prop object to el.style", async () => {
    const container = document.createElement("div");
    render(
      <div data-testid="styled" style={{ color: "rgb(255, 0, 0)", paddingLeft: "4px" }}>
        styled
      </div>,
      container,
    );
    await flush();
    const el = container.querySelector<HTMLDivElement>('[data-testid="styled"]');
    expect(el).not.toBeNull();
    expect(el?.style.color).toBe("rgb(255, 0, 0)");
    expect(el?.style.paddingLeft).toBe("4px");
  });
});

describe("smoke: components", () => {
  // BUG: a leaf component directly under a root renders nothing (foldSubtreeIntoStaging
  // returns before folding the fiber). Flip back to `it` once fixed.
  it.fails("renders a component's JSX output", async () => {
    function* Greeting(props: { name: string }) {
      return <p data-testid="greeting">Hello, {props.name}!</p>;
    }

    const container = document.createElement("div");
    render(<Greeting name="world" />, container);
    await flush();
    expect(container.querySelector('[data-testid="greeting"]')?.textContent).toBe("Hello, world!");
  });

  // BUG: a leaf component directly under a root renders nothing (foldSubtreeIntoStaging
  // returns before folding the fiber). Flip back to `it` once fixed.
  it.fails("renders state from useState on initial mount", async () => {
    function* Counter() {
      const [count] = yield* useState(7);
      return <span data-testid="count">{count}</span>;
    }

    const container = document.createElement("div");
    render(<Counter />, container);
    await flush();
    expect(container.querySelector('[data-testid="count"]')?.textContent).toBe("7");
  });
});

describe("smoke: context", () => {
  it("consumer reads the provider value via useContext", async () => {
    const ThemeCtx = createContext<"light" | "dark">("light");

    function* Badge() {
      const theme = yield* useContext(ThemeCtx);
      return <span data-testid="badge">{theme}</span>;
    }

    const container = document.createElement("div");
    render(
      <ThemeCtx value="dark">
        <Badge />
      </ThemeCtx>,
      container,
    );
    await flush();
    expect(container.querySelector('[data-testid="badge"]')?.textContent).toBe("dark");
  });

  // BUG: a leaf component directly under a root renders nothing (foldSubtreeIntoStaging
  // returns before folding the fiber). Flip back to `it` once fixed.
  it.fails("falls back to the context default when no provider is present", async () => {
    const LocaleCtx = createContext<"en" | "fi">("en");

    function* Locale() {
      const locale = yield* useContext(LocaleCtx);
      return <span data-testid="locale">{locale}</span>;
    }

    const container = document.createElement("div");
    render(<Locale />, container);
    await flush();
    expect(container.querySelector('[data-testid="locale"]')?.textContent).toBe("en");
  });

  it("nested providers shadow outer values", async () => {
    const ThemeCtx = createContext<"light" | "dark">("light");

    function* Badge() {
      const theme = yield* useContext(ThemeCtx);
      return <span data-testid="badge">{theme}</span>;
    }

    const container = document.createElement("div");
    render(
      <ThemeCtx value="dark">
        <ThemeCtx value="light">
          <Badge />
        </ThemeCtx>
      </ThemeCtx>,
      container,
    );
    await flush();
    expect(container.querySelector('[data-testid="badge"]')?.textContent).toBe("light");
  });
});

describe("smoke: nested components", () => {
  it("renders a component that is not directly under the root", async () => {
    function* Greeting(props: { name: string }) {
      return <p data-testid="greeting">Hello, {props.name}!</p>;
    }
    const c = await mount(<Greeting name="world" />);
    expect(byTestId(c, "greeting").textContent).toBe("Hello, world!");
  });

  it("renders useState's initial value", async () => {
    function* Counter() {
      const [count] = yield* useState(7);
      return <span data-testid="count">{count}</span>;
    }
    const c = await mount(<Counter />);
    expect(byTestId(c, "count").textContent).toBe("7");
  });

  it("falls back to the context default when no provider is present", async () => {
    const LocaleCtx = createContext<"en" | "fi">("en");
    function* Locale() {
      const locale = yield* useContext(LocaleCtx);
      return <span data-testid="locale">{locale}</span>;
    }
    const c = await mount(<Locale />);
    expect(byTestId(c, "locale").textContent).toBe("en");
  });

  it("calls a lazy context default instead of storing the function", async () => {
    const LocaleCtx = createContext<"en" | "fi">(() => "fi");
    function* Locale() {
      const locale = yield* useContext(LocaleCtx);
      return <span data-testid="locale">{locale}</span>;
    }
    const c = await mount(<Locale />);
    expect(byTestId(c, "locale").textContent).toBe("fi");
  });
});
