import { getPersonRows } from "../../../../global-state";
import type { PersonRow } from "../../../../types";

/**
 * The rows live outside React.
 *
 * Anything a Suspense boundary reads with `use()` has to be created outside
 * render: a suspended render is thrown away and replayed, and a promise built
 * during that render comes back as a *different* promise, so `use()` suspends
 * again and the boundary never settles. `useMemo` is not a safe hiding place —
 * the React Compiler's memo cache does not survive the replay either, which is
 * what made this fatal in the production build and merely lucky in dev.
 *
 * Keeping the promise in module scope removes the question entirely: its
 * identity only changes when an event handler changes it.
 */
export type RowsState = {
  /** What `<PersonTable>` suspends on. */
  promise: Promise<PersonRow[]>;
  /** The same rows once settled, for the controls' counts. */
  rows: PersonRow[] | undefined;
  /** True while a change is in flight. */
  loading: boolean;
};

export const INITIAL_COUNT = 30_000;
let controller = new AbortController();

const listeners = new Set<() => void>();
let version = 0;
let state: RowsState;

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Swap in a new promise, then republish once it settles.
 *
 * The republish hands out a *new*, already-resolved promise rather than the
 * one that just settled. That matters: `PersonTableBody` is memoised, so if the
 * promise kept its identity React would skip the rerender — and the rerender is
 * what lets `use()` return instead of suspending. The boundary would sit on its
 * fallback forever with the data sitting right there, resolved.
 */
function publish(next: Promise<PersonRow[]>) {
  const token = ++version;
  state = { promise: next, rows: state?.rows, loading: true };
  emit();
  void next.then((rows) => {
    // A newer change may have landed while this was in flight.
    if (token !== version) return;
    state = { promise: Promise.resolve(rows), rows, loading: false };
    emit();
  });
}

publish(getPersonRows(INITIAL_COUNT, controller.signal));

export const rowsStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Stable between changes, so `useSyncExternalStore` does not loop. */
  getSnapshot(): RowsState {
    return state;
  },
  setCount(next: number) {
    publish(
      state.promise.then(async (current) => {
        if (current.length === next) return current;
        return await getPersonRows(next, controller.signal);
      }),
    );
  },
  updatePerson(person: PersonRow) {
    publish(
      state.promise.then((current) => {
        const index = current.findIndex((row) => row.id === person.id);
        if (index === -1) return current;
        return [...current.slice(0, index), person, ...current.slice(index + 1)];
      }),
    );
  },
};
