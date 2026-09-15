import { Field, FieldDescription, FieldLabel, Range } from "../../../dos";
import { useEffect, useState, withIdle } from "yract";
import sleep from "../../../utils/sleep";

type OwnProps = {
  count: number;
  setCount(count: number): Promise<void>;
};

export function* PersonCount({ count, setCount }: OwnProps) {
  const [state, setState] = yield* useState(count, [count]);
  const onIdle = yield* withIdle();
  const [loading, setLoading] = yield* useState(false);
  yield* useEffect(
    async (signal) => {
      console.log("effect");
      await sleep(500, signal);
      onIdle(() => {
        console.log("on idle");
        void setLoading(false);
      }, signal);
      void setLoading(true);
      await setCount(count);
    },
    [state],
  );
  return (
    <Field>
      <FieldLabel>Number of persons</FieldLabel>
      <Range value={state} min={10} max={90_000} onValueChange={setState} />
      <FieldDescription>
        {loading ? "Loading" : "Idle"}Number of rows for the table <b>({state})</b>
      </FieldDescription>
    </Field>
  );
}
