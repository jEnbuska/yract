import { Field, FieldLabel, Select } from "../../../dos";
import CityOptions from "./CityOptions";
import type { PersonRow } from "../../../types";
import { type ChangeEvent, useCallback } from "react";

type OwnProps = {
  highlight: string;
  setHighlight(next: string): unknown;
  rows: PersonRow[] | undefined;
};

export function PersonHighlight({ highlight, setHighlight, rows }: OwnProps) {
  const onChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setHighlight(e.target.value);
    },
    [setHighlight],
  );
  return (
    <Field>
      <FieldLabel id="person-highlight-label">Highlight city</FieldLabel>
      <Select
        value={highlight}
        aria-labelledby="person-highlight-label"
        data-testid="highlight-select"
        name="highligh"
        onChange={onChange}
      >
        <CityOptions rows={rows} />
      </Select>
    </Field>
  );
}
