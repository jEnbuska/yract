/**
 * Compile-time tests for `useMemo`'s overloads — checked by `npm run typecheck`,
 * not executed. They guard two things that are easy to regress:
 *
 * 1. Deps are forwarded to the factory with their exact types, whether the
 *    callback takes all of them, a prefix of them, or none.
 * 2. A component yielding a narrow `MemoHookDescriptor<T, Deps>` is still a
 *    valid `Component`. This needs `fn` declared as a *method* in the
 *    descriptor: as a property its parameters are contravariant under
 *    `strictFunctionTypes`, so `MemoHookDescriptor<T, [A, B]>` would not be
 *    assignable to the `MemoHookDescriptor<unknown, DependencyList>` member of
 *    the `HookDescriptor` union.
 */
import { useMemo } from "../hooks/memo";

/**
 * Invariant type equality: unlike a mutual `extends` check this one does not
 * accept `any`, so a parameter that silently degrades to `any` still fails.
 */
type Expect<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : never;

type SortDir = "asc" | "desc";
type PersonRow = { name: string; id: string };

declare const search: string;
declare const rows: readonly PersonRow[] | undefined;
declare const sortDir: SortDir;
declare const dynamicDeps: readonly unknown[];

/** Deps forwarded as factory arguments. */
function* ForwardedDeps() {
  const filtered = yield* useMemo(
    (query, allRows) => {
      const _query: Expect<typeof query, string> = true;
      const _allRows: Expect<typeof allRows, readonly PersonRow[] | undefined> = true;
      void _query;
      void _allRows;
      return allRows?.filter(({ name }) => name.includes(query));
    },
    [search, rows],
  );
  const _filtered: Expect<typeof filtered, PersonRow[] | undefined> = true;
  void _filtered;
  return <div>{filtered?.length}</div>;
}

/** Zero-argument factory closing over its deps. */
function* ClosedOverDeps() {
  const sorted = yield* useMemo(() => {
    return rows?.toSorted((a, b) => (sortDir === "asc" ? 1 : -1) * a.name.localeCompare(b.name));
  }, [sortDir, rows]);
  const _sorted: Expect<typeof sorted, PersonRow[] | undefined> = true;
  void _sorted;
  return <div>{sorted?.length}</div>;
}

/** A callback may take a strict prefix of the deps — the per-arity overloads cover 1-5. */
function* PartialDeps() {
  const filtered = yield* useMemo(
    (query) => {
      const _query: Expect<typeof query, string> = true;
      void _query;
      return rows?.filter(({ name }) => name.includes(query));
    },
    [search, rows],
  );
  const _filtered: Expect<typeof filtered, PersonRow[] | undefined> = true;
  void _filtered;
  return <div>{filtered?.length}</div>;
}

/** Past the last per-arity overload, only the full-arity rest-tuple overload matches. */
function* SixDeps() {
  const joined = yield* useMemo(
    (a, b, c, d, e, f) => `${a}${b}${c}${d}${e}${f}`,
    [search, 1, true, "x", 2, false],
  );
  const _joined: Expect<typeof joined, string> = true;
  void _joined;
  return <div>{joined}</div>;
}

/** Non-literal deps fall through to the `DependencyList` overload. */
function* DynamicDeps() {
  const count = yield* useMemo((...args) => args.length, dynamicDeps);
  const _count: Expect<typeof count, number> = true;
  void _count;
  return <div>{count}</div>;
}

export function* MemoTypeTests() {
  return (
    <div>
      <ForwardedDeps />
      <ClosedOverDeps />
      <PartialDeps />
      <SixDeps />
      <DynamicDeps />
    </div>
  );
}
