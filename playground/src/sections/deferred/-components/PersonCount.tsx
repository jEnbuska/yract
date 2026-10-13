import { Field, FieldDescription, FieldLabel, Range, Spinner } from "../../../dos";
import { useStable, useState } from "yract";

type OwnProps = {
  count: number;
  setCount(count: number): void;
  loading: boolean;
};

export function* PersonCount({ count, setCount, loading }: OwnProps) {
  const [state, setState] = yield* useState(count, [count]);
  const onClick = yield* useStable(() => {
    setCount(state);
  });
  return (
    <Field>
      <FieldLabel>Number of persons</FieldLabel>
      <Range
        data-testid="count-range"
        name="count"
        value={state}
        min={10}
        max={90_000}
        onInput={(event) => setState(Number(event.currentTarget.value))}
        onClick={onClick}
      />
      <FieldDescription>
        <b>({state})</b> {loading && <Spinner label={"Loading rows"} />}
      </FieldDescription>
    </Field>
  );
}
