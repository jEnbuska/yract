# yract — API reference

> Components are **generator functions**: hooks are called with `yield*`, JSX is `return`ed.

## Contents

1. [Components](#components)
2. [Rendering](#rendering)
3. [Hooks](#hooks)
4. [Capabilities](#capabilities)
5. [Context](#context)
6. [Framework props](#framework-props)
7. [Elements and events](#elements-and-events)
8. [Controlled form elements](#controlled-form-elements)
9. [Types](#types)
10. [Known limitations](#known-limitations)

---

## Components

```tsx
function* Greeting(props: { name: string }) {
  const [count, setCount] = yield* useState(0);
  return (
    <button onClick={() => setCount((c) => c + 1)}>
      Hi {props.name} ({count})
    </button>
  );
}
```

- A component is a `function*`. Hooks run with `yield*`; the JSX is the `return` value.
- The body re-runs from the top on every render. Hook state persists, keyed by call order, so hooks must run in the same order every render.
- `<>…</>` (`Fragment`) groups children without a wrapper element.

JSX setup (`tsconfig.json`):

```json
{ "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "yract" } }
```

---

## Rendering

### `createRoot(container)`

```ts
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
```

Returns a `Root`. Each root has its own scheduler and context.

### `render(child, container)`

Shorthand for `createRoot(container)` followed by `root.render(child)`. Returns the `Root`.

---

## Hooks

### `useState(initial, deps?)`

```ts
const [value, setValue] = yield * useState(0);
await setValue((prev) => prev + 1);
```

- `initial` may be a function; it is called once.
- The setter accepts a value or an updater and returns a promise that resolves once the update is committed. Setting the current value is a no-op.
- `deps`: when they change, the state resets to `initial`.

### `useEffect(fn, deps = [])`

```ts
yield *
  useEffect(
    (signal) => {
      const id = setInterval(tick, 1000);
      signal.onabort = () => clearInterval(id);
    },
    [delay],
  );
```

- Runs after the DOM is committed, and again whenever `deps` change.
- `deps` defaults to `[]`, so an effect without deps runs **once** (unlike React).
- `signal` aborts before the next run and on unmount. `fn` may also return a cleanup function.

### `useMemo(fn, deps)`

```ts
const visible = yield * useMemo(filterRows, [rows, query]); // filterRows(rows, query)
```

Recomputes only when `deps` change. The deps are passed to `fn` as arguments, so a module-level function can be used directly.

### `useRef(initial)`

Returns `{ current }`, stable for the component's lifetime.

### `useId()`

Returns a string id that is unique and stable for the component's lifetime.

### `useStable(fn)`

Returns a function with a permanent identity that always calls the latest `fn`. Use it for callbacks passed to children.

### `useContext(ctx, selector?, transform?)`

See [Context](#context).

### `useElementRef()`

```tsx
const input = yield * useElementRef<HTMLInputElement>();
yield * useEffect(() => input.current?.focus(), []);
return <input ref={input} />;
```

`ref.current` looks the element up on access, so it is `undefined` until the element is mounted.

### `useDefer(config?)`

```tsx
const [Defer, deferring] = yield * useDefer();
return (
  <>
    <SearchBox />
    <Defer>
      <HugeTable faded={deferring} />
    </Defer>
  </>
);
```

- Children of `Defer` mount normally, then **update** at low priority: urgent updates (typing, clicks) commit first, and the deferred subtree commits once it has caught up.
- `deferring` is `true` while a deferred update is pending.
- `config.disabled` turns deferral off.

---

## Capabilities

Hook-like helpers that take **no hook slot**, so they may be called conditionally or in any order.

| Capability          | Returns                                                                 |
| :------------------ | :---------------------------------------------------------------------- |
| `withReturn(child)` | Ends the render immediately with `child`, skipping the rest of the body |
| `withRerender()`    | A stable callback that rerenders the component                          |
| `withContext(ctx)`  | The context's current value, without subscribing to changes             |

```tsx
function* Gate(props: { open: boolean }) {
  if (!props.open) yield* withReturn(<p>Closed</p>);
  const [n] = yield* useState(0);
  return <p>Open {n}</p>;
}
```

---

## Context

### `createContext(defaultValue, name?)`

```tsx
const Theme = createContext<"light" | "dark">("light", "Theme");

<Theme value="dark">
  <Badge />
</Theme>;
```

- The context is itself the provider component: `<Theme value={…}>`.
- `defaultValue` may be a function; it is called once. It is used when no provider is above the consumer.
- `name` (capitalised) appears in debug names.

### `useContext(ctx, selector?, transform?)`

```ts
const theme = yield * useContext(Theme);
// Rerender only when `highlight` flips for this row:
const settings = yield * useContext(Settings, (s) => [s.highlight === row.city]);
// Return a derived value instead of the whole context:
const isMine =
  yield *
  useContext(
    Settings,
    (s) => [s.highlight],
    (_s, h) => h === row.city,
  );
```

- Without a selector the consumer rerenders whenever the provided value changes identity.
- With a selector it rerenders only when the selected array changes (compared item by item).

### `resolveContext(map, ctx)`

Low-level lookup used by the renderer; returns the provided value or the default.

---

## Framework props

Accepted by every component and element; never passed to the DOM.

| Prop   | Effect                                                                                  |
| :----- | :-------------------------------------------------------------------------------------- |
| `key`  | Identity among siblings. Keyed children are moved rather than re-created when reordered |
| `deps` | On a component: rerender from the parent only when `deps` change                        |

```tsx
{
  rows.map((row) => <Row key={row.id} row={row} deps={[row]} />);
}
```

---

## Elements and events

- `className` and `htmlFor` map to `class` and `for`.
- Attribute props are typed by how they reach the DOM, never `boolean | string`:
  - **toggles** (`disabled`, `hidden`, `readOnly`, …) take `boolean`: `true` adds the attribute, `false` removes it;
  - **text and enumerated values** take `string`, e.g. `aria-expanded="false"`, `draggable="true"`, `download="report.pdf"` (`download=""` just downloads);
  - **numbers** take `string | number` and are written as strings. A percentage is always a string (`width="50%"`).
- `null` and `undefined` remove any attribute.
- `style` takes an object. CSS custom properties (`--x`) are supported.
- `on*` props receive the **native DOM event**, with `currentTarget` typed as the element. Handlers are attached to their own element, so `stopPropagation()` and non-bubbling events behave as in plain DOM.
- `onFocus`/`onBlur` listen to `focusin`/`focusout`. `on*Capture` is not supported.

---

## Controlled form elements

`value` (inputs, `<textarea>`, `<select>`) and `checked` (checkboxes, radios) are **controlled**: after every user or browser change the element is put back to the rendered value, and the handler decides what the next render shows.

```tsx
function* Upper() {
  const [text, setText] = yield* useState("");
  return <input value={text} onInput={(e) => setText(e.currentTarget.value.toUpperCase())} />;
}
```

There are no uncontrolled variants: `defaultValue` and `defaultChecked` are not accepted. For a field the component does not need to track, keep its value in `useState` all the same.

This holds for typing, paste, delete, autofill and password managers (which send `input` without `beforeinput`), range drags, `<select>` picks, and label clicks. For radio buttons the whole group is restored, including the option the browser unchecked when another was clicked. A `<select>` keeps its value even when its `<option>`s are rendered by a child component.

---

## Types

| Type                 | Description                                              |
| :------------------- | :------------------------------------------------------- |
| `Component<P>`       | `(props: P) => ComponentGenerator`                       |
| `ComponentProps<T>`  | Props of an intrinsic element (`"input"`) or a component |
| `PropsWithChildren`  | `{ children: Children }`                                 |
| `Child` / `Children` | What a component can return / receive as children        |
| `FrameworkProps`     | `{ key?, deps? }`                                        |
| `Context<T>`         | A context, usable as a provider component                |
| `ContextProps<T>`    | Provider props: `{ value, children, key? }`              |
| `RefObject<T>`       | `{ current: T }`                                         |
| `ComponentGenerator` | The generator a component returns                        |
| `DependencyList`     | `readonly unknown[]`                                     |

---

## Known limitations

These are pinned by `it.fails` / `test.fail` tests and will flip when fixed:

- A component with no child components, rendered directly under a root (`render(<Leaf />, el)`), renders nothing. Wrap it in another component.
- Removing an `on*` handler (setting it to `undefined`) does not detach it.
- `className={false}` after a set class leaves the class in place.
- When a keystroke in the middle of a controlled input is rejected, the caret moves to the end.
