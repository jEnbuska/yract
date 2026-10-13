# yract playground

A [Vite](https://vitejs.dev/) app that runs **yract** in a real browser. It
holds one demo, the person table, plus a test fixture for controlled inputs.
`react-playground/` is the same demo in React, for comparison.

## The person table

`src/sections/deferred/` renders 6000 generated people (adjustable up to
90 000) next to a frame-lag dial. It exercises:

| Control                       | What it shows                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| **Search persons**            | A controlled text input filtering 6000 rows on every keystroke                               |
| **Number of persons**         | A load that a newer count aborts; `useState(count, [count])` reseeding local state           |
| **Highlight city**            | `useContext` with a selector: only the rows whose city gained or lost the highlight rerender |
| **Show only highlighted**     | A controlled checkbox that is disabled and forced off while nothing is highlighted           |
| **Show persons from**         | A controlled radio group                                                                     |
| Department `<select>` per row | `deps={[row]}`: editing one row rerenders only that row                                      |

The table's "Re-renders" column counts renders per row, so the effect of each
control is visible.

## Running it

From the repository root:

```bash
npm ci
npm ci --prefix playground
npm run dev --prefix playground   # http://localhost:5173
```

`vite.config.ts` aliases `yract` to `../src` and sets the JSX import source to
`yract`, so the playground runs straight from the library source with no build
step. `tsconfig.json` has matching `paths`, so editors resolve `yract` too.

## Tests

```bash
npm run playwright:install --prefix playground   # one-time browser download
npm run test:visual                              # from the repository root
```

- `tests/controlled-inputs.spec.ts` drives `fixtures/controlled.html`, a
  standalone page that is not linked from the app.
- `tests/deferred.spec.ts` and `tests/deferred-stress.spec.ts` drive the
  table (the file names predate the switch to sync rendering). They are slow, so `npm test` runs them in a second,
  single-worker pass (the `*-deferred` projects in `playwright.config.ts`).
- `tests/helpers.ts` holds `goToDemo`, `readRows` and `settled`, which waits until
  the table matches the controls.
