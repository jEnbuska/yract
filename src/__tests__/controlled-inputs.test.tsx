/**
 * Controlled form elements: the DOM always ends up showing what the component
 * returned, whatever the user (or the browser) did in between.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useState } from "yract";
import { flush } from "./utils/flush";
import { autofill, byTestId, mount, selectOption, slideTo, typeText } from "./utils/dom";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("text input", () => {
  it("follows state when the handler accepts the input", async () => {
    function* Name() {
      const [text, setText] = yield* useState("");
      return (
        <input data-testid="f" value={text} onInput={(e) => void setText(e.currentTarget.value)} />
      );
    }
    const c = await mount(<Name />);
    const el = byTestId<HTMLInputElement>(c, "f");
    typeText(el, "hello");
    await flush();
    expect(el.value).toBe("hello");
  });

  it("shows the transformed value when the handler rewrites the input", async () => {
    function* Digitless() {
      const [text, setText] = yield* useState("a");
      return (
        <input
          data-testid="f"
          value={text}
          onInput={(e) => void setText(e.currentTarget.value.replace(/\d/g, ""))}
        />
      );
    }
    const c = await mount(<Digitless />);
    const el = byTestId<HTMLInputElement>(c, "f");
    // State stays "a", so props do not change and nothing is patched.
    typeText(el, "a1");
    await flush();
    expect(el.value).toBe("a");
  });

  it("reverts to the prop value when the handler ignores the input", async () => {
    const c = await mount(<input data-testid="f" value="fixed" onInput={() => {}} />);
    const el = byTestId<HTMLInputElement>(c, "f");
    typeText(el, "fixedX");
    await flush();
    expect(el.value).toBe("fixed");
  });

  it("reverts to the prop value after autofill (no beforeinput) when ignored", async () => {
    const c = await mount(<input data-testid="f" value="fixed" onInput={() => {}} />);
    const el = byTestId<HTMLInputElement>(c, "f");
    autofill(el, "someone@example.com");
    await flush();
    expect(el.value).toBe("fixed");
  });

  it("accepts an autofilled value when the handler stores it", async () => {
    function* Email() {
      const [text, setText] = yield* useState("");
      return (
        <input data-testid="f" value={text} onInput={(e) => void setText(e.currentTarget.value)} />
      );
    }
    const c = await mount(<Email />);
    const el = byTestId<HTMLInputElement>(c, "f");
    autofill(el, "someone@example.com");
    await flush();
    expect(el.value).toBe("someone@example.com");
  });

  it("writes a value change that comes from outside the input", async () => {
    let set!: (v: string) => unknown;
    function* Outside() {
      const [text, setText] = yield* useState("one");
      set = setText;
      return <input data-testid="f" value={text} onInput={() => {}} />;
    }
    const c = await mount(<Outside />);
    void set("two");
    await flush();
    expect(byTestId<HTMLInputElement>(c, "f").value).toBe("two");
  });

  it("keeps the caret where the user left it when the value is rewritten", async () => {
    function* Upper() {
      const [text, setText] = yield* useState("ab");
      return (
        <input
          data-testid="f"
          value={text}
          onInput={(e) => void setText(e.currentTarget.value.toUpperCase())}
        />
      );
    }
    const c = await mount(<Upper />);
    const el = byTestId<HTMLInputElement>(c, "f");
    el.dispatchEvent(new InputEvent("beforeinput", { bubbles: true }));
    el.value = "axb";
    el.setSelectionRange(2, 2);
    el.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await flush();
    expect(el.value).toBe("AXB");
    expect(el.selectionStart).toBe(2);
  });

  it("survives the handler unmounting the input mid-event", async () => {
    function* Vanishing() {
      const [shown, setShown] = yield* useState(true);
      const [after, setAfter] = yield* useState(0);
      return (
        <div>
          {shown ? (
            <input
              data-testid="f"
              value=""
              onInput={() => {
                void setShown(false);
                void setAfter(1);
              }}
            />
          ) : null}
          <span data-testid="after">{after}</span>
        </div>
      );
    }
    const c = await mount(<Vanishing />);
    typeText(byTestId<HTMLInputElement>(c, "f"), "x");
    await flush();
    expect(c.querySelector('[data-testid="f"]')).toBeNull();
    expect(byTestId(c, "after").textContent).toBe("1");
  });
});

describe("textarea", () => {
  it("reverts to the prop value when the handler ignores the input", async () => {
    const c = await mount(<textarea data-testid="t" value="line" onInput={() => {}} />);
    const el = byTestId<HTMLTextAreaElement>(c, "t");
    typeText(el, "lineX");
    await flush();
    expect(el.value).toBe("line");
  });

  it("follows state when the handler accepts the input", async () => {
    function* Notes() {
      const [text, setText] = yield* useState("");
      return (
        <textarea
          data-testid="t"
          value={text}
          onInput={(e) => void setText(e.currentTarget.value)}
        />
      );
    }
    const c = await mount(<Notes />);
    const el = byTestId<HTMLTextAreaElement>(c, "t");
    typeText(el, "a\nb");
    await flush();
    expect(el.value).toBe("a\nb");
  });
});

describe("select", () => {
  function* Options() {
    return (
      <>
        <option value="a">A</option>
        <option value="b">B</option>
        <option value="c">C</option>
      </>
    );
  }

  it("mounts showing its value even when the options come from a child component", async () => {
    const c = await mount(
      <select data-testid="s" value="c" onInput={() => {}}>
        <Options />
      </select>,
    );
    expect(byTestId<HTMLSelectElement>(c, "s").value).toBe("c");
  });

  it("reverts to the prop value when the handler ignores the change", async () => {
    const c = await mount(
      <select data-testid="s" value="b" onInput={() => {}}>
        <Options />
      </select>,
    );
    const el = byTestId<HTMLSelectElement>(c, "s");
    selectOption(el, "a");
    await flush();
    expect(el.value).toBe("b");
  });

  it("follows state when the handler accepts the change", async () => {
    function* Picker() {
      const [value, setValue] = yield* useState("a");
      return (
        <select data-testid="s" value={value} onInput={(e) => void setValue(e.currentTarget.value)}>
          <Options />
        </select>
      );
    }
    const c = await mount(<Picker />);
    const el = byTestId<HTMLSelectElement>(c, "s");
    selectOption(el, "c");
    await flush();
    expect(el.value).toBe("c");
  });
});

describe("range", () => {
  it("reverts to the prop value when the handler ignores the slide", async () => {
    const c = await mount(
      <input data-testid="r" type="range" min="0" max="100" value="40" onInput={() => {}} />,
    );
    const el = byTestId<HTMLInputElement>(c, "r");
    slideTo(el, "90");
    await flush();
    expect(el.value).toBe("40");
  });

  it("follows state when the handler accepts the slide", async () => {
    function* Volume() {
      const [value, setValue] = yield* useState(40);
      return (
        <input
          data-testid="r"
          type="range"
          min="0"
          max="100"
          value={String(value)}
          onInput={(e) => void setValue(Number(e.currentTarget.value))}
        />
      );
    }
    const c = await mount(<Volume />);
    const el = byTestId<HTMLInputElement>(c, "r");
    slideTo(el, "90");
    await flush();
    expect(el.value).toBe("90");
  });
});

describe("checkbox", () => {
  it("stays unchecked when the handler declines", async () => {
    const c = await mount(
      <input data-testid="b" type="checkbox" checked={false} onClick={() => {}} />,
    );
    const el = byTestId<HTMLInputElement>(c, "b");
    el.click();
    await flush();
    expect(el.checked).toBe(false);
  });

  it("stays checked when the handler declines", async () => {
    const c = await mount(<input data-testid="b" type="checkbox" checked onClick={() => {}} />);
    const el = byTestId<HTMLInputElement>(c, "b");
    el.click();
    await flush();
    expect(el.checked).toBe(true);
  });

  it("toggles when the handler accepts", async () => {
    function* Toggle() {
      const [on, setOn] = yield* useState(false);
      return (
        <input
          data-testid="b"
          type="checkbox"
          checked={on}
          onClick={(e) => void setOn(e.currentTarget.checked)}
        />
      );
    }
    const c = await mount(<Toggle />);
    const el = byTestId<HTMLInputElement>(c, "b");
    el.click();
    await flush();
    expect(el.checked).toBe(true);
    el.click();
    await flush();
    expect(el.checked).toBe(false);
  });

  it("holds a forced value against repeated clicks", async () => {
    const c = await mount(
      <input data-testid="b" type="checkbox" checked={false} onClick={() => {}} />,
    );
    const el = byTestId<HTMLInputElement>(c, "b");
    for (let i = 0; i < 5; i++) el.click();
    await flush();
    expect(el.checked).toBe(false);
  });
});

describe("radio group", () => {
  const OPTIONS = ["a", "b", "c"];

  function* Group(props: { name: string; value: string; onPick(value: string): unknown }) {
    return (
      <div>
        {OPTIONS.map((option) => (
          <input
            key={option}
            data-testid={`${props.name}-${option}`}
            type="radio"
            name={props.name}
            value={option}
            checked={props.value === option}
            onChange={() => props.onPick(option)}
          />
        ))}
      </div>
    );
  }

  const checkedIn = (c: HTMLElement, name: string) =>
    [...c.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)]
      .filter((r) => r.checked)
      .map((r) => r.value);

  it("keeps the original option checked when the handler ignores the click", async () => {
    const c = await mount(<Group name="g" value="a" onPick={() => {}} />);
    byTestId<HTMLInputElement>(c, "g-b").click();
    await flush();
    // The browser silently unchecked "a"; it must be restored, not just "b" reverted.
    expect(checkedIn(c, "g")).toEqual(["a"]);
  });

  it("moves the selection when the handler accepts", async () => {
    function* Picker() {
      const [value, setValue] = yield* useState("a");
      return <Group name="g" value={value} onPick={setValue} />;
    }
    const c = await mount(<Picker />);
    byTestId<HTMLInputElement>(c, "g-c").click();
    await flush();
    expect(checkedIn(c, "g")).toEqual(["c"]);
    byTestId<HTMLInputElement>(c, "g-b").click();
    await flush();
    expect(checkedIn(c, "g")).toEqual(["b"]);
  });

  it("leaves a group with a different name alone", async () => {
    const c = await mount(
      <div>
        <Group name="first" value="a" onPick={() => {}} />
        <Group name="second" value="c" onPick={() => {}} />
      </div>,
    );
    byTestId<HTMLInputElement>(c, "first-b").click();
    await flush();
    expect(checkedIn(c, "first")).toEqual(["a"]);
    expect(checkedIn(c, "second")).toEqual(["c"]);
  });

  it("restores its own group when a radio outside this root shares the name", async () => {
    const foreign = document.createElement("input");
    foreign.type = "radio";
    foreign.name = "g";
    foreign.value = "foreign";
    document.body.appendChild(foreign);
    const c = await mount(<Group name="g" value="a" onPick={() => {}} />);
    foreign.checked = true;
    byTestId<HTMLInputElement>(c, "g-b").click();
    await flush();
    expect(checkedIn(c, "g")).toEqual(["a"]);
  });
});
