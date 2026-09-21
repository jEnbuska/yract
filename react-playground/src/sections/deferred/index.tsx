import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { Window, WindowBar, WindowBody } from "../../dos";
import { PersonTable, filterRows } from "./-components/PersonTable";
import { PersonFiltering } from "./-components/PersonFiltering";
import { PersonCount } from "./-components/PersonCount";
import { PersonHighlight } from "./-components/PersonHighlight";
import {
  NO_HIGHLIGHT,
  PersonTableContext,
  type PersonTableSettings,
  type UpdatePerson,
} from "./-components/PersonTable.shared";
import { INITIAL_COUNT, rowsStore } from "./-components/utils/rows-store";
import LagSpinner from "./-components/LagSpinner";

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
  const [highlight, setHighlight] = useState<string>(NO_HIGHLIGHT);
  const [count, setCount] = useState(INITIAL_COUNT);

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

  // For the labels only. The table filters the rows it resolves, below.
  const filtered = useMemo(() => filterRows(search, rows), [search, rows]);
  const highlighted = useMemo(
    () =>
      highlight === NO_HIGHLIGHT
        ? 0
        : (filtered?.filter((row) => row.city === highlight).length ?? 0),
    [highlight, filtered],
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
          <PersonFiltering
            value={search}
            setValue={setSearch}
            matches={`${filtered?.length ?? 0}/${rows?.length ?? 0}`}
          />
          <PersonCount count={count} setCount={updateCount} loading={loading} disabled={!rows} />
          <PersonHighlight
            highlight={highlight}
            setHighlight={setHighlight}
            matches={highlighted}
          />
          <PersonTableContext value={settings}>
            <PersonTable rows={promise} search={search} />
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
