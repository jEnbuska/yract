import { Field, FieldDescription, FieldLabel, Select } from "../../../dos";
import { CITIES } from "../../../global-state";
import { NO_HIGHLIGHT } from "./PersonTable.shared";
import { type ChangeEvent, useCallback } from "react";

type OwnProps = {
  highlight: string;
  setHighlight(next: string): unknown;
  matches: number;
};

export function PersonHighlight({ highlight, setHighlight, matches }: OwnProps) {
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
        onChange={onChange}
      >
        <option value={NO_HIGHLIGHT}>— none —</option>
        {CITIES.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </Select>
      <FieldDescription>
        {highlight === NO_HIGHLIGHT ? (
          "Picking a city rerenders every row: React context has no selector."
        ) : (
          <>
            <b data-testid="highlight-matches">{matches}</b> rows match.
          </>
        )}
      </FieldDescription>
    </Field>
  );
}
