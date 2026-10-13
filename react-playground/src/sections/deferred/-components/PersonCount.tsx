import { Field, FieldDescription, FieldLabel, Range, Spinner } from "../../../dos";
import { useCallback, useEffect, useState } from "react";

type OwnProps = {
  count: number;
  updateCount(count: number): Promise<void>;
  loading: boolean;
};

export function PersonCount({ count, updateCount }: OwnProps) {
  const [state, setState] = useState(count);
  // The yract original uses `useState(count, [count])`, which resets local
  // state when the dep changes. React has no such overload.
  useEffect(() => setState(count), [count]);
  const [loading, setLoading] = useState(false);
  const onClick = useCallback(async () => {
    setLoading(true);
    await updateCount(state);
    setLoading(false);
  }, [updateCount, state]);
  return (
    <Field>
      <FieldLabel>Number of persons</FieldLabel>
      <Range
        data-testid="count-range"
        name="count"
        value={state}
        min={10}
        max={90_000}
        onChange={(event) => setState(Number(event.currentTarget.value))}
        onClick={onClick}
      />
      <FieldDescription>
        <b>({state})</b> {loading && <Spinner label={"Loading rows"} />}
      </FieldDescription>
    </Field>
  );
}
