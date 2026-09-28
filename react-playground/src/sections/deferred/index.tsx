import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Window, WindowBar, WindowBody } from "../../dos";
import { PersonTable } from "./-components/PersonTable";
import { PersonFiltering } from "./-components/PersonFiltering";
import { PersonCount } from "./-components/PersonCount";
import { PersonHighlight } from "./-components/PersonHighlight";
import { PersonCityOnly } from "./-components/PersonCityOnly";
import { PersonDepartmentRadioGroup } from "./-components/PersonDepartmentRadioGroup";
import {
  NO_HIGHLIGHT,
  PersonTableContext,
  type PersonTableSettings,
  type UpdatePerson,
} from "./-components/PersonTable.shared";
import { INITIAL_COUNT, rowsStore } from "./-components/utils/rows-store";
import LagSpinner from "./-components/LagSpinner";
import {
  filterRowsByCity,
  filterRowsByDepartment,
  filterRowsBySearch,
} from "./-components/utils/misc";

/**
 * Memoised so the provider hands down the same object while nothing it carries
 * has changed. A fresh literal on every render would rerender every row on
 * every keystroke, on top of the rerenders the highlight already causes.
 */
function toSettings(updatePerson: UpdatePerson, highlight: string): PersonTableSettings {
  return { updatePerson, highlight };
}

export function DeferredDemo() {
  const [search, setSearch] = useState("");
  const [highlight, setHighlight] = useState<string>(() => localStorage.getItem("highlight") ?? "");
  const [count, setCount] = useState(INITIAL_COUNT);
  const [cityOnly, setCityOnly] = useState(false);
  const [department, setDepartment] = useState("");

  useEffect(() => {
    localStorage.setItem("highlight", highlight);
  }, [highlight]);

  const { promise, rows, loading } = useSyncExternalStore(
    rowsStore.subscribe,
    rowsStore.getSnapshot,
  );

  const updateCount = useCallback(
    (next: number) => {
      if (next === count) return;
      setCount(next);
      rowsStore.setCount(next);
    },
    [count],
  );

  const updatePerson = useCallback<UpdatePerson>((person) => {
    rowsStore.updatePerson(person);
  }, []);

  // For the controls' counts and labels only. The table filters the rows it resolves.
  const filteredBySearch = useMemo(() => filterRowsBySearch(rows, search), [rows, search]);
  const filteredByCity = useMemo(
    () => filterRowsByCity(filteredBySearch, highlight, cityOnly),
    [filteredBySearch, highlight, cityOnly],
  );
  const filtered = useMemo(
    () => filterRowsByDepartment(filteredByCity, department),
    [filteredByCity, department],
  );
  const settings = useMemo(() => toSettings(updatePerson, highlight), [updatePerson, highlight]);

  return (
    <div className="dos-split">
      <Window>
        <WindowBar title="React Defer Table" aside="/deferred" />
        <WindowBody>
          <h2>Deferred Table ({rows?.length ?? 0} rows)</h2>
          <p>
            The same demo as the yract playground, built with React 19, the React Compiler, Suspense
            and <code>useDeferredValue</code>. The table fades while deferred.
          </p>
          <PersonCount count={count} setCount={updateCount} loading={loading} disabled={!rows} />
          <PersonFiltering
            value={search}
            setValue={setSearch}
            matches={`${filtered.length}/${rows?.length ?? 0}`}
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
            <PersonTable
              rows={promise}
              search={search}
              city={cityOnly ? highlight : NO_HIGHLIGHT}
              department={department}
            />
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
