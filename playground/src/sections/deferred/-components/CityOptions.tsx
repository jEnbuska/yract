import { NO_HIGHLIGHT } from "./PersonTable.shared";
import { CITIES } from "./utils/row-store";

/** Component for testing that select options as child component work */
export default function* CityOptions() {
  return (
    <>
      <option value={NO_HIGHLIGHT}>— none —</option>
      {CITIES.map((city) => (
        <option value={city}>{city}</option>
      ))}
    </>
  );
}
