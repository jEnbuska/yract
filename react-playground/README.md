# react-playground

The `playground/` deferred-table demo, rebuilt in React so the two can be put
side by side. Same DOS kit, same CSS, same files, same row count, same
interactions, and the same Playwright specs. When the yract demo changes, change
this one with it.

```bash
npm ci
npm run dev        # http://localhost:5175
npm run build
npm run typecheck
npm test           # Playwright, the single-worker *-deferred projects
```

## Stack

- **React 19.3** with `useDeferredValue`
- **React Compiler**, on for the whole app — `@vitejs/plugin-react` v6's
  `compiler: true`, backed by `oxc-transform-react`.
- **Vite 8**

## How each yract idea maps

| yract                                          | React                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `useDeferredValue(filtered, [filtered])`       | `useDeferredValue(filtered)`; deferring is `deferred !== filtered` |
| `useStable(fn)`                                | `useCallback(fn, deps)`                                            |
| `useMemo(fn, [a, b])` (deps forwarded as args) | `useMemo(() => fn(a, b), [a, b])`                                  |
| `useRef`, `useState`, `useEffect`, `useId`     | the same hooks                                                     |
| `useEffect((signal) => …)`                     | `useEffect(() => { …; return cleanup })`                           |
| `deps={[row]}` on a child                      | `memo(PersonTableRow)`                                             |
| `useState(value, [deps])` (resets on deps)     | a `useEffect` that re-seeds local state                            |
| `useContext(ctx, selector)`                    | `use(ctx)` — no selector, see below                                |
| `onInput` on controlled fields                 | `onChange`, which React fires on every `input` event               |
| `onChange` on the `RadioGroup` `<fieldset>`    | `onChange` on each `<input type="radio">`                          |

The rows live in `useState` in `DeferredDemo`, loaded by an effect on mount and
reloaded by `updateCount` (which aborts a load still in flight), exactly as in
the yract version.

## The one thing this port cannot match

In the yract version each row subscribes to the table context **with a
selector** that reduces the whole settings object to one boolean — "is my city
the highlighted one". Changing the highlight rerenders only the rows whose
answer flipped, and the rest keep their render count.

React has no selector API for context, and `memo` does not stop a context
update from reaching a consumer. Every row reads `PersonTableContext`, so every
row is rerendered when the highlight changes. The context value is still
memoised (`toPersonTableContext` under `useMemo`), which keeps _unrelated_
parent renders from doing the same — but it cannot narrow a real change.

The two specs in `tests/deferred.spec.ts` that assert the narrow rerender are
pinned with `test.fail()` for that reason.

Closing that gap in React means leaving context behind: `useSyncExternalStore`
with a per-row selector, or a store library. That is a different architecture
from the one being compared, so it is deliberately not done here.

## What was deliberately not optimised

The brief was to make this as fast as React reasonably allows _without_
optimising anything the yract version does not optimise. So there is no
virtualisation, no windowing, no `content-visibility` beyond what the shared
DOS stylesheet already sets, and no splitting of the context into narrower
pieces. Both apps render every row into the document.

## Caveats when comparing

`main.tsx` does not use `<StrictMode>`: it double-invokes render in dev, which
would double the "Re-renders" column. The React Compiler's memo caches can
still change when a component body reruns at all, so compare production builds,
and prefer DOM/profiler measurements over that column.
