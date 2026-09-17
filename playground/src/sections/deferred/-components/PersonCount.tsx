import { Field, FieldDescription, FieldLabel, Range } from "../../../dos";
import { useEffect, useState } from "yract";
import sleep from "../../../utils/sleep";

type OwnProps = {
  count: number;
  setCount(count: number): Promise<void>;
};

export function* PersonCount({ count, setCount }: OwnProps) {
  const [state, setState] = yield* useState(count, [count]);
  const [loading, setLoading] = yield* useState(false);
  yield* useEffect(
    async (signal) => {
      await sleep(500, signal);
      void setLoading(true);
      await setCount(state);
      void setLoading(false);
    },
    [state],
  );
  return (
    <Field>
      <FieldLabel>Number of persons</FieldLabel>
      <Range value={state} min={10} max={90_000} onValueChange={setState} />
      <FieldDescription>
        {loading ? "Loading" : "Idle"} <b>({state})</b>
      </FieldDescription>
    </Field>
  );
}
