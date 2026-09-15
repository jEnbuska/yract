/**
 * Compile-time tests for composing hooks — checked by `npm run typecheck`.
 *
 * A composite hook that `yield*`s several hooks must infer its own generator
 * type without an explicit annotation. That only works while the hooks leave
 * `TNext` off their `Generator<…>`: TypeScript infers the composite's `TNext`
 * as the *intersection* of what each delegation demands, and two concrete hook
 * states intersect to `never` (their `type` fields are disjoint literals),
 * which no caller can send to. Omitting `TNext` defaults it to `any`, and
 * `X & any` stays `any`, so the intersection never collapses.
 */
import { useEffect } from "../hooks/effect";
import { useRef } from "../hooks/ref";
import { useWeakRef } from "../hooks/weakRef";
import { useState } from "../hooks/state";
import { useId } from "../hooks/id";
import { useStable } from "../hooks/stable";
import { useContext } from "../hooks/context";
import { useMemo } from "../hooks/memo";
import { createContext } from "../context";

type Expect<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : never;

const Ctx = createContext({ label: "x" });

/** No return annotation — every hook below must compose cleanly. */
function* useComposite<T extends HTMLElement>() {
  const elRef = yield* useWeakRef<T>();
  const box = yield* useRef<number>(0);
  const id = yield* useId();
  const { label } = yield* useContext(Ctx);
  const [n, setN] = yield* useState(0);
  const doubled = yield* useMemo((x) => x * 2, [n]);
  const onPoke = yield* useStable(() => void setN((c) => c + 1));

  yield* useEffect(() => {
    box.current = doubled;
  }, [doubled]);

  return { elRef, box, id, label, n, doubled, onPoke };
}

/** The composite's return type must survive delegation with exact types. */
export function* Consumer() {
  const { elRef, box, id, label, n, doubled } = yield* useComposite<HTMLDivElement>();
  const _id: Expect<typeof id, string> = true;
  const _label: Expect<typeof label, string> = true;
  const _n: Expect<typeof n, number> = true;
  const _doubled: Expect<typeof doubled, number> = true;
  const _box: Expect<typeof box.current, number> = true;
  void _id;
  void _label;
  void _n;
  void _doubled;
  void _box;
  return (
    <div ref={elRef} id={id}>
      {label}
      {n}
    </div>
  );
}

/** A composite of composites must also infer. */
function* useNested() {
  const inner = yield* useComposite<HTMLSpanElement>();
  yield* useEffect(() => {});
  return inner.id;
}

export function* NestedConsumer() {
  const id = yield* useNested();
  const _id: Expect<typeof id, string> = true;
  void _id;
  return <span>{id}</span>;
}
