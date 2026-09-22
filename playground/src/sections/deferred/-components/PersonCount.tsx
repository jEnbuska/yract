import { Field, FieldDescription, FieldLabel, Range } from "../../../dos";
import { useStable, useState } from "yract";

type OwnProps = {
  count: number;
  updateCount(count: number): Promise<void>;
  loading: boolean;
};

export function* PersonCount({ count, updateCount, loading }: OwnProps) {
  const [state, setState] = yield* useState(count, [count]);
  const onClick = yield* useStable(() => {
    void updateCount(state);
  });
  return (
    <Field>
      <FieldLabel>Number of persons</FieldLabel>
      <Range
        data-testid="count-range"
        value={state}
        min={10}
        max={90_000}
        onInput={(event) => setState(Number(event.currentTarget.value))}
        onClick={onClick}
      />
      <FieldDescription>
        {loading ? "Loading" : "Idle"} <b>({state})</b>
      </FieldDescription>
    </Field>
  );
}
