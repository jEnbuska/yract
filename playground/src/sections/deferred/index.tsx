import { useDefer, useEffect, useMemo, useRef, useStable, useState } from "yract";
import { Window, WindowBar, WindowBody } from "../../dos";
import { getPersonRows } from "./-components/utils/row-store";
import { PersonTable } from "./-components/PersonTable";
import type { PersonRow } from "../../types";
import { PersonFiltering } from "./-components/PersonFiltering";
import { PersonCount } from "./-components/PersonCount";
import { PersonHighlight } from "./-components/PersonHighlight";
import { PersonCityOnly } from "./-components/PersonCityOnly";
import { PersonTableContext } from "./-components/PersonTable.shared";
import LagSpinner from "./-components/LagSpinner";
import {
  filterRowsByCity,
  filterRowsByDepartment,
  filterRowsBySearch,
  toPersonTableContext,
} from "./-components/utils/misc";
import { PersonDepartmentRadioGroup } from "./-components/PersonDepartmentRadioGroup";

export function* DeferredDemo() {
  const [search, setSearch] = yield* useState("");
  const resolvable = yield* useRef<PromiseWithResolvers<void> | undefined>(undefined);
  const [count, setCount] = yield* useState(6000);
  const [department, setDepartment] = yield* useState("");
  const controllerRef = yield* useRef(new AbortController());
  const updateCount = yield* useStable(async (n: number) => {
    if (n === count) return;
    controllerRef.current.abort();
    void setCount(n);
    const { signal } = (controllerRef.current = new AbortController());
    const { resolve } = (resolvable.current = Promise.withResolvers());
    // A newer count aborts this load; its rejection is expected, not an error.
    const rows = await getPersonRows(n, signal).catch(() => undefined);
    if (!rows || signal.aborted) return;
    return setRows(rows).then(resolve);
  });

  const [highlight, setHighlight] = yield* useState<string>(
    () => localStorage.getItem("highlight") ?? "",
  );
  yield* useEffect(() => {
    localStorage.setItem("highlight", highlight);
  }, [highlight]);

  const [cityOnly, setCityOnly] = yield* useState(false);
  const [rows, setRows] = yield* useState<PersonRow[] | undefined>();
  yield* useEffect((signal) => {
    signal.onabort = () => controllerRef.current.abort();
    void getPersonRows(count, controllerRef.current.signal).then(setRows);
  }, []);

  const filteredBySearch = yield* useMemo(filterRowsBySearch, [rows, search]);

  const filteredByCity = yield* useMemo(filterRowsByCity, [filteredBySearch, highlight, cityOnly]);

  const filtered = yield* useMemo(filterRowsByDepartment, [filteredByCity, department]);

  const updatePerson = yield* useStable(async (person: PersonRow) => {
    const index = rows!.findIndex((row) => row.id === person.id);
    if (index === -1) return;
    void setRows([...rows!.slice(0, index), person, ...rows!.slice(index + 1)]);
  });
  const settings = yield* useMemo(toPersonTableContext, [updatePerson, highlight]);

  const [Defer, deferring] = yield* useDefer();

  return (
    <div className="dos-split">
      <Window>
        <WindowBar title="Defer Table" aside="/deferred" />
        <WindowBody>
          <h2>Deferred Table ({count} rows)</h2>
          <PersonCount count={count} updateCount={updateCount} loading={deferring || !rows} />
          <PersonFiltering
            value={search}
            setValue={setSearch}
            matches={
              rows
                ? `${deferring ? "?" : filtered!.length}/${rows.length}`
                : `${search ? "?" : count}/${count}`
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
            <PersonTable rows={filtered} deferring={deferring} Defer={Defer} />
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
