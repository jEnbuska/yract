import { describe, expect, it } from "vitest";
import { render, useState } from "yract";

/**
 * Repro tests for #177 — user-edited DOM state is never reconciled, so
 * `value`/`checked` behave as defaults rather than as controlled state.
 *
 * These are expected to FAIL until the fix lands. They are written first, per
 * the bug-fix workflow in CLAUDE.md.
 */

async function flush(ticks = 8): Promise<void> {
  for (let i = 0; i < ticks; i++) {
    await Promise.resolve();
  }
}

/** Simulate a user edit: the browser writes the DOM, then the event fires. */
function userTypes(el: HTMLInputElement, text: string): void {
  el.value = text;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function userClicks(el: HTMLInputElement): void {
  el.checked = !el.checked;
  el.dispatchEvent(new Event("click", { bubbles: true }));
}

describe("controlled elements", () => {
  it("holds the value the component returned when the handler rejects the input", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    function* DigitsRejected(_props: object) {
      const [text, setText] = yield* useState("");
      return (
        <input
          data-testid="field"
          value={text}
          onInput={(e) => {
            const raw = (e.target as HTMLInputElement).value;
            void setText(raw.replace(/\d/g, ""));
          }}
        />
      );
    }

    render(<DigitsRejected />, container);
    await flush();

    const el = container.querySelector<HTMLInputElement>('[data-testid="field"]')!;
    expect(el).not.toBeNull();

    userTypes(el, "a");
    await flush();
    expect(el.value).toBe("a");

    // "a1" -> handler strips the digit -> state stays "a" -> no prop change.
    // The DOM must still be pulled back to "a".
    userTypes(el, "a1");
    await flush();
    expect(el.value).toBe("a");
  });

  it("holds the checked state the component returned when the handler declines", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    function* NeverChecks(_props: object) {
      const [checked] = yield* useState(false);
      return <input data-testid="box" type="checkbox" checked={checked} onClick={() => {}} />;
    }

    render(<NeverChecks />, container);
    await flush();

    const el = container.querySelector<HTMLInputElement>('[data-testid="box"]')!;
    expect(el.checked).toBe(false);

    userClicks(el);
    await flush();
    expect(el.checked).toBe(false);
  });
});
