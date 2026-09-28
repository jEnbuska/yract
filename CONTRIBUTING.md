# Contributing to Y'ract

## Development setup

Node 24 (see `.nvmrc`).

```bash
git clone https://github.com/jEnbuska/yract.git
cd yract
npm ci
npm ci --prefix playground
```

## Commands

| Command                           | Description                                      |
| :-------------------------------- | :----------------------------------------------- |
| `npm run build`                   | Compile `src/` to `dist/`                        |
| `npm run typecheck`               | Type-check, including tests and type tests       |
| `npm run typecheck:playground`    | Type-check the playground                        |
| `npm test`                        | Vitest unit tests (jsdom)                        |
| `npm test -- <path>`              | Run one test file                                |
| `npm run test:visual`             | Playwright tests in Chromium, Firefox and WebKit |
| `npm run knip`                    | Dead code, unused exports and dependencies       |
| `npm run lint` / `lint:fix`       | oxlint (type-aware)                              |
| `npm run format` / `format:check` | oxfmt                                            |
| `npm run fix`                     | Lint fixes plus formatting                       |

## Before opening a PR

```bash
npm run knip
npm run fix
npm run build
npm run typecheck:playground
npm test
npm run test:visual
```

If any step fails, fix it and run the sequence again.

## Pull request guidelines

- **Target branch:** `dev`
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:` …)
- **Issue link:** every PR body needs `Closes #<n>` or `Fixes #<n>`; CI enforces it.

## Tests

- `src/__tests__/` — unit tests. Use `mount()` and the input helpers in `utils/dom.tsx`; they replay the event sequence a browser sends for typing, autofill, picks and slides.
- `src/__typetests__/` — compile-time type tests, checked by `npm run typecheck` only.
- `playground/tests/` — Playwright. `controlled-inputs.spec.ts` drives `playground/fixtures/controlled.html`; the `deferred*.spec.ts` files drive the demo.
- A known bug is pinned with `it.fails` / `test.fail()` and a `// BUG:` comment. When it is fixed the test starts failing — flip it back to a normal test.

## Project structure

| Path                | Description                                            |
| :------------------ | :----------------------------------------------------- |
| `src/index.ts`      | Public API                                             |
| `src/hooks/`        | Hooks, one file each                                   |
| `src/capabilities/` | `withReturn`, `withRerender`, `withContext`            |
| `src/instances/`    | Fibers and `Root` (incl. controlled-input restore)     |
| `src/reconciler/`   | Diffing new output against the previous slots          |
| `src/scheduler/`    | Render/commit scheduling — see `docs/scheduler.md`     |
| `src/ui-actions/`   | Recorded DOM operations and their commit-time appliers |
| `src/render/`       | Entry points, element props and events                 |
| `playground/`       | Demo app, test fixtures and Playwright tests           |
| `react-playground/` | The same demo in React, for comparison                 |
| `docs/`             | API reference and internals                            |

Code that is exported only for use inside `src/` carries an `@internal` tag.

## License

MIT
