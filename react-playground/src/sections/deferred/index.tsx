import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Window, WindowBar, WindowBody } from "../../dos";
import { getPersonRows } from "./-components/utils/row-store";
import { PersonTable } from "./-components/PersonTable";
import type { PersonRow } from "../../types";
import { PersonFiltering } from "./-components/PersonFiltering";
import { PersonCount } from "./-components/PersonCount";
import { PersonHighlight } from "./-components/PersonHighlight";
import { PersonCityOnly } from "./-components/PersonCityOnly";
import { PersonTableContext } from "./-components/PersonTable.shared";
import {
  filterRowsByCity,
  filterRowsByDepartment,
  filterRowsBySearch,
  toPersonTableContext,
} from "./-components/utils/misc";
import { PersonDepartmentRadioGroup } from "./-components/PersonDepartmentRadioGroup";
import LagSpinner from "./-components/LagSpinner";

export function DeferredDemo() {
  const [search, setSearch] = useState("");
  const [count, setCount] = useState(6000);
  const [department, setDepartment] = useState("");
  const controllerRef = useRef(new AbortController());
  const [rows, setRows] = useState<PersonRow[] | undefined>();
  const updateCount = useCallback(
    async (n: number) => {
      if (n === count) return;
      controllerRef.current.abort();
      setCount(n);
      const { signal } = (controllerRef.current = new AbortController());
      // A newer count aborts this load; its rejection is expected, not an error.
      const loaded = await getPersonRows(n, signal).catch(() => undefined);
      if (!loaded || signal.aborted) return;
      setRows(loaded);
    },
    [count],
  );

  const [highlight, setHighlight] = useState<string>(() => localStorage.getItem("highlight") ?? "");
  useEffect(() => {
    localStorage.setItem("highlight", highlight);
  }, [highlight]);

  const [cityOnly, setCityOnly] = useState(false);
  useEffect(() => {
    void getPersonRows(count, controllerRef.current.signal)
      .then(setRows)
      .catch(() => undefined);
    return () => controllerRef.current.abort();
    // Loads once on mount, as in the yract demo; later counts go through `updateCount`.
  }, []);

  const filteredBySearch = useMemo(() => filterRowsBySearch(rows, search), [rows, search]);

  const filteredByCity = useMemo(
    () => filterRowsByCity(filteredBySearch, highlight, cityOnly),
    [filteredBySearch, highlight, cityOnly],
  );

  const filtered = useMemo(
    () => filterRowsByDepartment(filteredByCity, department),
    [filteredByCity, department],
  );

  // The counterpart of `useDefer(filtered, [filtered])`.
  const deferredRows = useDeferredValue(filtered);
  const isDeferring = deferredRows !== filtered;
  const updatePerson = useCallback((person: PersonRow) => {
    setRows((current) => {
      const index = current?.findIndex((row) => row.id === person.id) ?? -1;
      if (!current || index === -1) return current;
      return [...current.slice(0, index), person, ...current.slice(index + 1)];
    });
  }, []);

  const settings = useMemo(
    () => toPersonTableContext(updatePerson, highlight),
    [updatePerson, highlight],
  );
  return (
    <div className="dos-split">
      <Window>
        <WindowBar title="Defer Table" aside="/deferred" />
        <WindowBody>
          <h2>Deferred Table ({count} rows)</h2>
          <PersonCount count={count} updateCount={updateCount} loading={!rows} />
          <PersonFiltering
            value={search}
            setValue={setSearch}
            matches={
              rows ? `${filtered!.length}/${rows.length}` : `${search ? "?" : count}/${count}`
            }
          />
          <div>
            <PersonHighlight
              highlight={highlight}
              setHighlight={setHighlight}
              rows={filteredBySearch}
            />
            <PersonCityOnly cityOnly={cityOnly} setCityOnly={setCityOnly} highlight={highlight} />
          </div>
          <PersonDepartmentRadioGroup
            department={department}
            setDepartment={setDepartment}
            rows={filteredByCity}
          />
          <PersonTableContext value={settings}>
            <PersonTable rows={deferredRows} isDeferring={isDeferring} />
          </PersonTableContext>
        </WindowBody>
      </Window>
      <Window>
        <WindowBar title="Frame lag" aside="last 16s" />
        <WindowBody>
          <LagSpinner />
        </WindowBody>
      </Window>
    </div>
  );
}
