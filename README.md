<p align="center">
  <img src="assets/wordmark.svg" alt="Y'ract" height="80" />
</p>

# Y'ract

> A minimal JSX UI library powered by JavaScript generator functions

**yract** uses plain JavaScript [generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) as components. Hooks are called with `yield*`, JSX is produced by `return`, and state lives in local variables managed by the framework.

---

## Installation

```bash
npm install yract
```

Configure the automatic JSX transform in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "yract"
  }
}
```

No JSX imports are needed, and every HTML/SVG tag is type-checked.

---

## Quick start

```tsx
import { createRoot, useState } from "yract";

function* Counter() {
  const [count, setCount] = yield* useState(0);
  return <button onClick={() => setCount((c) => c + 1)}>Clicked {count} times</button>;
}

createRoot(document.getElementById("root")!).render(<Counter />);
```

The component body re-runs from the top on every render, so handlers always see the current values.

---

## Features

### Hooks

All hooks are generators called with `yield*`.

```tsx
function* Timer() {
  const [tick, setTick] = yield* useState(0);
  yield* useEffect((signal) => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    signal.onabort = () => clearInterval(id);
  }, []);
  return <p>Seconds: {tick}</p>;
}
```

`useState`, `useEffect`, `useMemo`, `useRef`, `useId`, `useStable`, `useContext`, `useElementRef` and `useDefer`.

### Context

A context is itself the provider component:

```tsx
const Theme = createContext<"light" | "dark">("light", "Theme");

function* Badge() {
  const theme = yield* useContext(Theme);
  return <span className={theme}>{theme}</span>;
}

function* App() {
  return (
    <Theme value="dark">
      <Badge />
    </Theme>
  );
}
```

`useContext` takes an optional selector, so a consumer only rerenders when the part it reads changes.

### Controlled form elements

`value` and `checked` always win. Whatever the user types, pastes, autofills or clicks, the element ends up showing what the component rendered — including radio buttons the browser unchecked as a side effect.

```tsx
function* Digits() {
  const [text, setText] = yield* useState("");
  return <input value={text} onInput={(e) => setText(e.currentTarget.value.replace(/\D/g, ""))} />;
}
```

### Deferred rendering

`useDefer` renders a subtree after the urgent work, so typing stays responsive while a large table catches up:

```tsx
function* Search() {
  const [query, setQuery] = yield* useState("");
  const [Defer, deferring] = yield* useDefer();
  return (
    <>
      <input value={query} onInput={(e) => setQuery(e.currentTarget.value)} />
      <Defer>
        <Results query={query} faded={deferring} />
      </Defer>
    </>
  );
}
```

### Capabilities

`withReturn`, `withRerender` and `withContext` are hook-like helpers that take no hook slot, so they can be called conditionally.

---

## Documentation

- [API reference](docs/api.md)
- [Scheduler internals](docs/scheduler.md)
- [Contributing](CONTRIBUTING.md)

## License

MIT
