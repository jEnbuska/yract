import { createContext } from "react";
import type { PersonRow } from "../../../types";

export type UpdatePerson = (person: PersonRow) => void;

/** Nothing highlighted. Kept as a constant so the `<Select>` can round-trip it. */
export const NO_HIGHLIGHT = "none";

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
 * Unlike the yract original this cannot subscribe with a selector: React has no
 * such API, and `memo` does not stop a context update from reaching a consumer.
 * Every row therefore rerenders when the highlight changes, not just the rows
 * whose answer changed. See README.md.
 */
export const PersonTableContext = createContext<PersonTableSettings>({
  updatePerson: () => {},
  highlight: NO_HIGHLIGHT,
});
