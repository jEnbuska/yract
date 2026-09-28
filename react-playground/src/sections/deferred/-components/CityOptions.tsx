import { useMemo } from "react";
import { NO_HIGHLIGHT } from "./PersonTable.shared";
import { CITIES } from "../../../global-state";
import type { PersonRow } from "../../../types";
import { countRowsPerCity } from "./utils/misc";

type OwnProps = {
  rows?: PersonRow[];
};

/** Component for testing that select options as child component work */
export default function CityOptions({ rows }: OwnProps) {
  const rowPerCity = useMemo(() => countRowsPerCity(rows), [rows]);
  return (
    <>
      <option value={NO_HIGHLIGHT}>— none —</option>
      {CITIES.map((city) => {
        const count = rowPerCity.get(city);
        let postfix = "";
        if (count) postfix = `(${count})`;
        return (
          <option key={city} value={city}>
            {city} {postfix}
          </option>
        );
      })}
    </>
  );
}
