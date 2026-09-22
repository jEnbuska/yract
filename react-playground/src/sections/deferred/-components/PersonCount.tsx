import { Field, FieldDescription, FieldLabel, Range } from "../../../dos";
import { type ChangeEvent, useCallback, useEffect, useState } from "react";

type OwnProps = {
  count: number;
  setCount(count: number): void;
  loading: boolean;
  disabled: boolean;
};

export function PersonCount({ count, setCount, loading, disabled }: OwnProps) {
  const [state, setState] = useState(count);
  // The yract original uses `useState(count, [count])`, which resets local
  // state when the dep changes. React has no such overload.
  useEffect(() => setState(count), [count]);
  useEffect(() => {
    const handle = setTimeout(() => setCount(state), 500);
    return () => clearTimeout(handle);
  }, [state, setCount]);
  const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setState(Number(event.target.value));
  }, []);
  return (
    <Field>
      <FieldLabel>Number of persons</FieldLabel>
      <Range value={state} min={10} max={90_000} onChange={onChange} disabled={disabled} />
      <FieldDescription>
        {loading ? "Loading" : "Idle"} <b>({state})</b>
      </FieldDescription>
    </Field>
  );
}
