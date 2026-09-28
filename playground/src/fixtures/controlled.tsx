/**
 * Controlled-input fixture for `tests/controlled-inputs.spec.ts`.
 *
 * Each control comes in variants whose handler accepts, rewrites or ignores
 * the input, so the spec can check the DOM always shows what was rendered.
 * Served by Vite at `/fixtures/controlled.html`; not part of the app.
 */
import { render, useState } from "yract";

const OPTIONS = ["a", "b", "c"];

function* Text() {
  const [accepted, setAccepted] = yield* useState("");
  const [digitless, setDigitless] = yield* useState("");
  return (
    <fieldset>
      <input
        data-testid="text-accept"
        value={accepted}
        onInput={(e) => void setAccepted(e.currentTarget.value)}
      />
      <input
        data-testid="text-digitless"
        value={digitless}
        onInput={(e) => void setDigitless(e.currentTarget.value.replace(/\d/g, ""))}
      />
      <input data-testid="text-fixed" value="fixed" onInput={() => {}} />
      <textarea data-testid="textarea-fixed" value="fixed" onInput={() => {}} />
      <output data-testid="text-accept-state">{accepted}</output>
    </fieldset>
  );
}

function* Options() {
  return (
    <>
      {OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option.toUpperCase()}
        </option>
      ))}
    </>
  );
}

function* Selects() {
  const [value, setValue] = yield* useState("a");
  return (
    <fieldset>
      <select
        data-testid="select-accept"
        value={value}
        onInput={(e) => void setValue(e.currentTarget.value)}
      >
        <Options />
      </select>
      <select data-testid="select-fixed" value="b" onInput={() => {}}>
        <Options />
      </select>
      <input
        data-testid="range-fixed"
        type="range"
        min="0"
        max="100"
        value="40"
        onInput={() => {}}
      />
    </fieldset>
  );
}

function* Checkboxes() {
  const [on, setOn] = yield* useState(false);
  return (
    <fieldset>
      <label>
        <input
          data-testid="checkbox-accept"
          type="checkbox"
          checked={on}
          onClick={(e) => void setOn(e.currentTarget.checked)}
        />
        Accept
      </label>
      <label>
        <input data-testid="checkbox-fixed" type="checkbox" checked={false} onClick={() => {}} />
        Fixed
      </label>
    </fieldset>
  );
}

function* RadioGroup(props: { name: string; value: string; onPick(value: string): unknown }) {
  return (
    <fieldset>
      {OPTIONS.map((option) => (
        <label key={option}>
          <input
            data-testid={`${props.name}-${option}`}
            type="radio"
            name={props.name}
            value={option}
            checked={props.value === option}
            onChange={() => props.onPick(option)}
          />
          {option.toUpperCase()}
        </label>
      ))}
    </fieldset>
  );
}

function* Radios() {
  const [value, setValue] = yield* useState("a");
  return (
    <div>
      <RadioGroup name="radio-accept" value={value} onPick={setValue} />
      <RadioGroup name="radio-fixed" value="a" onPick={() => {}} />
    </div>
  );
}

function* Fixture() {
  return (
    <main>
      <Text />
      <Selects />
      <Checkboxes />
      <Radios />
    </main>
  );
}

render(<Fixture />, document.getElementById("root")!);
