import { describe, expect, it } from "vitest";
import { type Child, type ComponentGenerator, useEffect, useState } from "yract";
import { flush } from "./utils/flush";
import { byTestId, mount } from "./utils/dom";

describe("return yield child", () => {
  it("ends the render with the yielded element", async () => {
    function* Gate(props: { open: boolean }): ComponentGenerator {
      if (!props.open) return yield <i data-testid="out">closed</i>;
      return <b data-testid="out">open</b>;
    }
    const c = await mount(<Gate open={false} />);
    expect(byTestId(c, "out").textContent).toBe("closed");
  });

  function* Badge(): ComponentGenerator {
    return <em>badge</em>;
  }

  // Every kind of Child, and the text it should leave in the container.
  const children: [name: string, child: Child, text: string][] = [
    ["element", <i>element</i>, "element"],
    [
      "fragment",
      <>
        <i>frag</i>ment
      </>,
      "fragment",
    ],
    ["component element", <Badge />, "badge"],
    ["string", "plain text", "plain text"],
    ["number", 42, "42"],
    ["bigint", 7n, "7"],
    ["true", true, ""],
    ["false", false, ""],
    ["null", null, ""],
    ["undefined", undefined, ""],
  ];

  it.each(children)("accepts a %s", async (_name, child, text) => {
    function* Early(): ComponentGenerator {
      return yield child;
    }
    const c = await mount(
      <div data-testid="box">
        <Early />
      </div>,
    );
    expect(byTestId(c, "box").textContent).toBe(text);
  });

  it("ends the component's render from inside a custom hook", async () => {
    function* useName(loading: boolean): ComponentGenerator<string> {
      const [name] = yield* useState("Ada");
      if (loading) return yield <i data-testid="out">loading</i>;
      return name;
    }
    let setLoading!: (loading: boolean) => void;
    function* Greeting(): ComponentGenerator {
      const [loading, set] = yield* useState(true);
      setLoading = set;
      const name = yield* useName(loading);
      return <b data-testid="out">Hi {name}</b>;
    }
    const c = await mount(<Greeting />);
    expect(byTestId(c, "out").textContent).toBe("loading");
    setLoading(false);
    await flush();
    expect(byTestId(c, "out").textContent).toBe("Hi Ada");
  });

  it("cleans up an effect that the early return skips", async () => {
    const log: string[] = [];
    let setBlocked!: (blocked: boolean) => void;
    function* Widget(): ComponentGenerator {
      const [blocked, set] = yield* useState(false);
      setBlocked = set;
      if (blocked) return yield <i data-testid="out">blocked</i>;
      yield* useEffect((signal) => {
        log.push("start");
        signal.onabort = () => log.push("stop");
      }, []);
      return <b data-testid="out">ok</b>;
    }
    const c = await mount(<Widget />);
    expect(log).toEqual(["start"]);
    setBlocked(true);
    await flush();
    expect(byTestId(c, "out").textContent).toBe("blocked");
    expect(log).toEqual(["start", "stop"]);
  });
});
