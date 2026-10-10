import { Field, FieldDescription, FieldLabel, Range } from "../../../dos";
import { useStable, useState } from "yract";
import { Spinner } from "../../../dos/Loader";

type OwnProps = {
  count: number;
  updateCount(count: number): Promise<void>;
  loading: boolean;
};

export function* PersonCount({ count, updateCount }: OwnProps) {
  const [state, setState] = yield* useState(count, [count]);
  const [loading, setLoading] = yield* useState(false);
  const onClick = yield* useStable(async () => {
    void setLoading(true);
    await updateCount(state);
    void setLoading(false);
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
