import { Checkbox, Field, FieldDescription } from "../../../dos";
import { NO_HIGHLIGHT } from "./PersonTable.shared";

type OwnProps = {
  cityOnly: boolean;
  setCityOnly(next: boolean): unknown;
  highlight: string;
  matches: number;
};

/**
 * Narrows the table to the highlighted city.
 *
 * Deliberately a *controlled* checkbox: `checked` comes from state and the
 * handler only requests a change. With no city highlighted there is nothing to
 * narrow to, so the box is disabled and forced back to unchecked — which is
 * the case where a controlled checkbox has to hold its own against the click.
 */
export function* PersonCityOnly({ cityOnly, setCityOnly, highlight, matches }: OwnProps) {
  const disabled = highlight === NO_HIGHLIGHT;
  return (
    <Field>
      <Checkbox
        checked={cityOnly && !disabled}
        disabled={disabled}
        label="Only the highlighted city"
        name="onlyHighlights"
        data-testid="city-only-checkbox"
        onClick={(e) => setCityOnly(e.currentTarget.checked)}
      />
      <FieldDescription>
        {disabled ? (
          "Pick a city above to enable this filter."
        ) : cityOnly ? (
          <>
            Showing <b data-testid="city-only-matches">{matches}</b> rows in {highlight}.
          </>
        ) : (
          `Narrows the table to ${highlight} without touching the search query.`
        )}
      </FieldDescription>
    </Field>
  );
}
