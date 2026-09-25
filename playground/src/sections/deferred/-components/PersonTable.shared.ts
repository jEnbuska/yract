import { createContext } from "yract";
import type { PersonRow } from "../../../types";

export type UpdatePerson = (person: PersonRow) => void;

/** Nothing highlighted. Kept as a constant so the `<Select>` can round-trip it. */
export const NO_HIGHLIGHT = "";

export type PersonTableSettings = {
  /** Stable for the lifetime of the demo — rows call it from their `<Select>`. */
  updatePerson: UpdatePerson;
  /** City to render inverted, or `NO_HIGHLIGHT`. */
  highlight: string;
};

/**
 * Carries the two things every one of the 30 000 rows needs, so neither has to
 * be threaded down through `PersonTable` → `PersonTableBody` → `PersonTableRow`.
 *
 * The interesting half is `highlight`. Rows subscribe with a selector that
 * reduces the whole settings object to one boolean — "is MY city the
 * highlighted one" — so changing the selection only rerenders the rows whose
 * answer actually flipped. The table's "Re-renders" column makes that visible:
 * switching Berlin → Tokyo ticks the Berlin and Tokyo rows and leaves the rest
 * untouched, even though every row consumes the same context.
 */
export const PersonTableContext = createContext<PersonTableSettings>(
  { updatePerson: () => {}, highlight: NO_HIGHLIGHT },
  "PersonTable",
);
