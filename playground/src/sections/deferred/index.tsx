import { useEffect, useMemo, useRef, useStable, useState } from "yract";
import { Window, WindowBar, WindowBody } from "../../dos";
import { getPersonRows } from "../../global-state";
import { PersonTable } from "./-components/PersonTable";
import type { PersonRow } from "../../types";
import { PersonFiltering } from "./-components/PersonFiltering";
import { PersonCount } from "./-components/PersonCount";
import LagSpinner from "./-components/LagSpinner";

function filterRows(query: string, rows?: PersonRow[]) {
  query = query.trim();
  if (!query) return rows;
  const lower = query
    .toLowerCase()
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);
  return rows?.filter(({ name, id, department, city }) => {
    const combined = `${name} ${id} ${department} ${city}`.toLowerCase();
    return lower.every((word) => combined.includes(word));
  });
}
export function* DeferredDemo() {
  const [search, setSearch] = yield* useState("");
  const resolvable = yield* useRef<PromiseWithResolvers<void> | undefined>(undefined);
  const [count, setCount] = yield* useState(5_000);
  const updateCount = yield* useStable(async (n: number) => {
    if (n === count) return;
    void setCount(n);
    resolvable.current = Promise.withResolvers();
    return resolvable.current.promise;
  });

  const [rows, setRows] = yield* useState<PersonRow[] | undefined>(undefined);
  yield* useEffect(
    async (signal) => {
      let next: PersonRow[];
      if (!rows) {
        next = await getPersonRows(count, signal);
      } else if (rows.length === count) {
        return;
      } else if (count > rows.length) {
        console.log("add rows", count - rows.length);
        next = [...rows, ...(await getPersonRows(count - rows.length, signal))];
      } else {
        next = rows.slice(0, count);
      }
      if (signal.aborted) return;
      await setRows(next);
      resolvable.current?.resolve();
    },
    [count],
  );

  const filtered = yield* useMemo(filterRows, [search, rows]);

  const updatePerson = yield* useStable((person: PersonRow) => {
    if (!rows?.length) return;
    const index = rows.findIndex((row) => row.id === person.id);
    if (index === -1) throw new Error(`Person with id ${person.id} does not exist`);
    void setRows([...rows.slice(0, index), person, ...rows.slice(index + 1)]);
  });
  return (
    <Window>
      <WindowBar title="Defer Table" aside="/deferred" />
      <WindowBody>
        <h2>Deferred Table ({rows?.length ?? 0} rows)</h2>
        <p>
          Wrapping the table in <code>&lt;Deferred&gt;</code> keeps the input responsive while 5 000
          rows re-render. The table fades while deferred.
        </p>
        <PersonFiltering
          value={search}
          setValue={setSearch}
          matches={`${filtered?.length ?? 0}/${rows?.length ?? 0}`}
        />
        <PersonCount count={count} setCount={updateCount} />
        <PersonTable rows={filtered} updatePerson={updatePerson} />
        <LagSpinner />
      </WindowBody>
    </Window>
  );
}
