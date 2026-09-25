import { useDefer, useEffect, useMemo, useRef, useStable, useState } from "yract";
import { Window, WindowBar, WindowBody } from "../../dos";
import { getPersonRows } from "./-components/utils/row-store";
import { PersonTable } from "./-components/PersonTable";
import type { PersonRow } from "../../types";
import { PersonFiltering } from "./-components/PersonFiltering";
import { PersonCount } from "./-components/PersonCount";
import { PersonHighlight } from "./-components/PersonHighlight";
import { PersonCityOnly } from "./-components/PersonCityOnly";
import {
  NO_HIGHLIGHT,
  PersonTableContext,
  type PersonTableSettings,
  type UpdatePerson,
} from "./-components/PersonTable.shared";
import LagSpinner from "./-components/LagSpinner";

function filterRows(query: string, rows?: PersonRow[], city?: string) {
  if (city) rows = rows?.filter((row) => row.city === city);
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
/**
 * Memoised so the provider hands down the same object while nothing it carries
 * has changed. A fresh literal on every render would fire all 30 000 row
 * subscriptions — each one running its selector only to conclude nothing moved.
 */
function toSettings(updatePerson: UpdatePerson, highlight: string): PersonTableSettings {
  return { updatePerson, highlight };
}

export function* DeferredDemo() {
  const [search, setSearch] = yield* useState("");
  const resolvable = yield* useRef<PromiseWithResolvers<void> | undefined>(undefined);
  const [count, setCount] = yield* useState(10);
  const controllerRef = yield* useRef(new AbortController());
  const updateCount = yield* useStable(async (n: number) => {
    if (n === count) return;
    controllerRef.current.abort();
    void setCount(n);
    const { signal } = (controllerRef.current = new AbortController());
    const { resolve } = (resolvable.current = Promise.withResolvers());
    const rows = await getPersonRows(n, signal);
    return setRows(rows).then(resolve);
  });

  const [highlight, setHighlight] = yield* useState<string>(
    () => localStorage.getItem("highlight") ?? "",
  );
  yield* useEffect(() => {
    localStorage.setItem("highlight", highlight);
  }, [highlight]);

  const [cityOnly, setCityOnly] = yield* useState(true);
  const [rows, setRows] = yield* useState<PersonRow[] | undefined>();
  yield* useEffect((signal) => {
    signal.onabort = () => controllerRef.current.abort();
    void getPersonRows(count, controllerRef.current.signal).then(setRows);
  }, []);

  const filtered = yield* useMemo(filterRows, [
    search,
    rows,
    cityOnly && highlight !== NO_HIGHLIGHT ? highlight : undefined,
  ]);
  const highlighted = yield* useMemo(
    (city: string, visible?: PersonRow[]) =>
      city === NO_HIGHLIGHT ? 0 : (visible?.filter((row) => row.city === city).length ?? 0),
    [highlight, filtered],
  );

  const updatePerson = yield* useStable(async (person: PersonRow) => {
    const index = rows!.findIndex((row) => row.id === person.id);
    if (index === -1) return;
    void setRows([...rows!.slice(0, index), person, ...rows!.slice(index + 1)]);
  });
  const settings = yield* useMemo(toSettings, [updatePerson, highlight]);

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
          <PersonHighlight
            highlight={highlight}
            setHighlight={setHighlight}
            matches={highlighted}
          />
          <PersonCityOnly
            cityOnly={cityOnly}
            setCityOnly={setCityOnly}
            highlight={highlight}
            matches={filtered?.length ?? 0}
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
