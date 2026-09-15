/**
 * DeferredDemo – large table with sort and search, wrapped in Deferred.
 *
 * Generates 5000 rows with 5 columns. The user can sort by the first
 * column and search by the first column or a combined text search
 * across all columns (datalist-style filtering).
 */
import { useEffect, useMemo, useRef, useStable, useState } from "yract";
import { Window, WindowBar, WindowBody } from "../../dos";
import { getPersonRows } from "../../global-state";
import { TickChart } from "./-components/TickChart";
import type { SortDir } from "./-components/PersonTable";
import { PersonTable } from "./-components/PersonTable";
import type { PersonRow } from "../../types";
import { PersonFiltering } from "./-components/PersonFiltering";
import { PersonCount } from "./-components/PersonCount";

/* ── Table row ── */

/* ── Table (reads deferred context) ── */

/* ── Main demo ── */

function filterRows(query: string, rows?: PersonRow[]) {
  let result = rows;
  if (!query) {
    return result;
  }
  const lower = query
    .toLowerCase()
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);

  return result?.filter(({ name, id, department, city }) => {
    const combined = `${name} ${id} ${department} ${city}`.toLowerCase();
    return lower.every((word) => combined.includes(word));
  });
}
export function* DeferredDemo() {
  const [search, setSearch] = yield* useState("");
  const [sortDir, setSortDir] = yield* useState<SortDir>("asc");
  const [count, setCount] = yield* useState(15_000);

  const [rows, setRows] = yield* useState<PersonRow[] | undefined>(undefined);

  yield* useEffect(async (signal) => {
    void setRows(undefined);
    const rows = await getPersonRows(count, signal);
    void setRows(rows);
  }, []);

  const filtered = yield* useMemo(filterRows, [search, rows]);

  const updatePerson = yield* useStable((person: PersonRow) => {
    if (!rows?.length) return;
    const index = rows.findIndex((row) => row.id === person.id);
    if (index === -1) throw new Error(`Person with id ${person.id} does not exist`);
    void setRows([...rows.slice(0, index), person, ...rows.slice(index + 1)]);
  });

  const updateSortDir = yield* useStable(() => {
    void setSortDir((dir) => {
      console.log("SET SORT");
      if (dir === "desc") return "asc";
      return "desc";
    }).then(() => console.log("SORTED"));
  });

  const start = yield* useRef(Date.now());
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
        <PersonCount count={count} setCount={setCount} />
        <PersonTable
          rows={filtered}
          sortDir={sortDir}
          onSort={updateSortDir}
          updatePerson={updatePerson}
        />

        <TickChart start={start.current} />
      </WindowBody>
    </Window>
  );
}
