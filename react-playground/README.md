# react-playground

The `playground/` deferred-table demo, rebuilt in React so the two can be put
side by side. Same DOS kit, same CSS, same row count, same interactions.

```bash
npm install
npm run dev        # http://localhost:5175
npm run build
npm run typecheck
npm test           # Playwright
```

## Stack

- **React 19.3** with `use()`, `<Suspense>`, `useDeferredValue`, `useTransition`
- **React Compiler**, on for the whole app — `@vitejs/plugin-react` v6's
  `compiler: true`, backed by `oxc-transform-react`. Verified in the bundle:
  the output calls `useMemoCache`.
- **Vite 8**

## How each yract idea maps

| yract                                          | React                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| `useDefer()` → `<Defer>` + `deferring`         | `useDeferredValue(sortedRows)`; `deferring` is `deferred !== current` |
| `rows === undefined ? <LoaderTrain/> : …`      | `use(rowsPromise)` inside `<Suspense fallback={<LoaderTrain/>}>`      |
| `useStable(fn)`                                | `useCallback(fn, [])`                                                 |
| `useMemo(fn, [a, b])` (deps forwarded as args) | `useMemo(() => fn(a, b), [a, b])`                                     |
| `useRef`, `useState`, `useEffect`, `useId`     | the same hooks                                                        |
| `deps={[row]}` on a child                      | `memo(PersonTableRow)`                                                |
| `useState(value, [deps])` (resets on deps)     | a `useEffect` that re-seeds local state                               |
| `useWeakRef<T>()`                              | `useRef<T>(null)`                                                     |

Data updates go through `startTransition`, so after the first mount React keeps
the current table on screen instead of dropping back to the Suspense fallback.
The fallback is therefore only ever seen once, which matches the yract version
showing its loader only while `rows` is `undefined`.

`updatePerson` and the row-count changes both rewrite the rows promise
(`setRowsPromise(p => p.then(…))`) rather than a rows array, because with
`use()` the resolved rows live below the boundary rather than in the parent.

## The one thing this port cannot match

In the yract version each row subscribes to the table context **with a
selector** that reduces the whole settings object to one boolean — "is my city
the highlighted one". Changing the highlight rerenders only the rows whose
answer flipped: only the rows whose answer flipped, with the rest keeping their render
count.

React has no selector API for context, and `memo` does not stop a context
update from reaching a consumer. Every row reads `PersonTableContext`, so every
row is rerendered when the highlight changes. The context value is still
memoised (`toSettings` under `useMemo`), which prevents _unrelated_ parent
renders from doing the same thing — but it cannot narrow a real change.

Closing that gap in React means leaving context behind: `useSyncExternalStore`
with a per-row selector, or a store library. That is a different architecture
from the one being compared, so it is deliberately not done here.

## What was deliberately not optimised

The brief was to make this as fast as React reasonably allows _without_
optimising anything the yract version does not optimise. So there is no
virtualisation, no windowing, no `content-visibility` beyond what the shared
DOS stylesheet already sets, and no splitting of the context into narrower
pieces. Both apps render all all rows into the document.

## Caveats when comparing

`main.tsx` mounts under `<StrictMode>`, which double-invokes render in dev.
The table's "Re-renders" column counts a `useRef` increment per render, so the
numbers there are **not** comparable to the yract column's — they are roughly
doubled, and the React Compiler's memo caches change when the body reruns at
all. Compare production builds, and prefer DOM/profiler measurements over that
column.
