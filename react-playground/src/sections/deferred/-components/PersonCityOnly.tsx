import { Checkbox, Field } from "../../../dos";
import { NO_HIGHLIGHT } from "./PersonTable.shared";

type OwnProps = {
  cityOnly: boolean;
  setCityOnly(next: boolean): unknown;
  highlight: string;
};

/**
 * Narrows the table to the highlighted city.
 *
 * Deliberately a *controlled* checkbox: `checked` comes from state and the
 * handler only requests a change. With no city highlighted there is nothing to
 * narrow to, so the box is disabled and forced back to unchecked — which is
 * the case where a controlled checkbox has to hold its own against the click.
 */
export function PersonCityOnly({ cityOnly, setCityOnly, highlight }: OwnProps) {
  const disabled = highlight === NO_HIGHLIGHT;

  return (
    <Field>
      <Checkbox
        checked={cityOnly && !disabled}
        disabled={disabled}
        name="onlyHighlights"
        label="Show only highlighted"
        data-testid="city-only-checkbox"
        onChange={(e) => setCityOnly(e.target.checked)}
      />
    </Field>
  );
}
