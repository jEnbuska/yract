import { Field, FieldDescription, FieldLabel, Select } from "../../../dos";
import { NO_HIGHLIGHT } from "./PersonTable.shared";
import CityOptions from "./CityOptions";

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
        name="highligh"
        onInput={(e) => {
          setHighlight(e.currentTarget.value);
        }}
      >
        <CityOptions />
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
