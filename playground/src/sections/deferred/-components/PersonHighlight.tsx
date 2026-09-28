import { Field, FieldLabel, Select } from "../../../dos";
import CityOptions from "./CityOptions";
import type { PersonRow } from "../../../types";

type OwnProps = {
  highlight: string;
  setHighlight(next: string): unknown;
  rows: PersonRow[] | undefined;
};

export function* PersonHighlight({ highlight, setHighlight, rows }: OwnProps) {
  return (
    <Field>
      <FieldLabel id="person-highlight-label">Highlight city</FieldLabel>
      <Select
        value={highlight}
        aria-labelledby="person-highlight-label"
        data-testid="highlight-select"
        name="highligh"
        onInput={(e) => {
          setHighlight(e.currentTarget.value);
        }}
      >
        <CityOptions rows={rows} />
      </Select>
    </Field>
  );
}
