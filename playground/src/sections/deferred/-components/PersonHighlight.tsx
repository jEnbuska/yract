import { Field, FieldDescription, FieldLabel, Select } from "../../../dos";
import { CITIES } from "./utils/row-store";
import { NO_HIGHLIGHT } from "./PersonTable.shared";

type OwnProps = {
  highlight: string;
  setHighlight(next: string): unknown;
  matches: number;
};

export function* PersonHighlight({ highlight, setHighlight, matches }: OwnProps) {
  return (
    <Field>
      <FieldLabel id="person-highlight-label">Highlight city</FieldLabel>
      <Select
        value={highlight}
        aria-labelledby="person-highlight-label"
        data-testid="highlight-select"
        onChange={(e) => setHighlight(e.currentTarget.value)}
      >
        <option value={NO_HIGHLIGHT}>— none —</option>
        {CITIES.map((city) => (
          <option value={city}>{city}</option>
        ))}
      </Select>
      <FieldDescription>
        {highlight === NO_HIGHLIGHT ? (
          "Rows subscribe with a selector — picking a city rerenders only the rows it applies to."
        ) : (
          <>
            <b data-testid="highlight-matches">{matches}</b> rows rerendered, the rest kept their
            render count.
          </>
        )}
      </FieldDescription>
    </Field>
  );
}
