import { useEffect, useMemo, useStable, useState } from "yract";
import { Window, WindowBar, WindowBody } from "../../dos";
import { getPersonRows } from "./-components/utils/row-store";
import PersonTable from "./-components/PersonTable";
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

export function* DeferredDemo() {
  const [search, setSearch] = yield* useState("");
  const [count, setCount] = yield* useState(6000);
  const [department, setDepartment] = yield* useState("");
  const [rows, setRows] = yield* useState<PersonRow[] | undefined>();
  const [highlight, setHighlight] = yield* useState<string>(
    () => localStorage.getItem("highlight") ?? "",
  );
  yield* useEffect(() => {
    localStorage.setItem("highlight", highlight);
  }, [highlight]);

  const [cityOnly, setCityOnly] = yield* useState(false);
  yield* useEffect(
    async (signal) => {
      try {
        const rows = await getPersonRows(count, signal);
        setRows(rows);
      } catch (_err: any) {
        console.log("Aborted: count changed ");
      }
    },
    [count],
  );

  const filteredBySearch = yield* useMemo(filterRowsBySearch, [rows, search]);

  const filteredByCity = yield* useMemo(filterRowsByCity, [filteredBySearch, highlight, cityOnly]);

  const filtered = yield* useMemo(filterRowsByDepartment, [filteredByCity, department]);

  const updatePerson = yield* useStable(async (person: PersonRow) => {
    const index = rows!.findIndex((row) => row.id === person.id);
    if (index === -1) return;
    setRows([...rows!.slice(0, index), person, ...rows!.slice(index + 1)]);
  });

  const settings = yield* useMemo(toPersonTableContext, [updatePerson, highlight]);
  return (
    <div className="dos-split">
      <Window>
        <WindowBar title="Defer Table" aside="/deferred" />
        <WindowBody>
          <h2>Deferred Table ({count} rows)</h2>
          <PersonCount count={count} setCount={setCount} loading={!rows} />
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
            <PersonTable rows={filtered} />
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
