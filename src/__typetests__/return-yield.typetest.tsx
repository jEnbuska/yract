/**
 * Compile-time tests for `return yield child` — checked by `npm run typecheck`.
 *
 * `ComponentGenerator` has `TNext = never`, so in an annotated component or
 * custom hook `yield child` is `never` and `return yield child` typechecks
 * against the declared return type. Every built-in hook must still infer its
 * exact result type inside such a generator.
 */
import { useState } from "../hooks/state";
import { useMemo } from "../hooks/memo";
import { useRef } from "../hooks/ref";
import { useId } from "../hooks/id";
import { useCallback } from "../hooks/callback";
import { useContext } from "../hooks/context";
import { useEffect } from "../hooks/effect";
import { useElementRef } from "../hooks/elementRef";
import { withContext } from "../capabilities/context";
import { withRerender } from "../capabilities/rerender";
import type { SetState } from "../hooks/hook-states";
import type { ComponentGenerator } from "../general-types";
import { createContext } from "yract";

type Expect<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : never;

type User = { id: string; name: string };

const Theme = createContext<"light" | "dark">("light");

/** A typed custom hook that returns early with UI. */
function* useUser(id: string, loading: boolean): ComponentGenerator<User> {
  const [user] = yield* useState<User>({ id, name: "Ada" });
  if (loading) return yield <p>Loading…</p>;
  if (!user.name) return yield null;
  return user;
}

/** Every built-in hook keeps its exact type inside an annotated component. */
export function* Profile({ id }: { id: string }): ComponentGenerator {
  const [count, setCount] = yield* useState(0);
  const doubled = yield* useMemo((n: number) => n * 2, [count]);
  const box = yield* useRef<string[]>([]);
  const elementId = yield* useId();
  const onClick = yield* useCallback((step: number) => setCount((c) => c + step));
  const theme = yield* useContext(Theme);
  const dark = yield* useContext(
    Theme,
    (t) => [t],
    (_ctx, t) => t === "dark",
  );
  const el = yield* useElementRef<HTMLDivElement>();
  const peek = yield* withContext(Theme);
  const rerender = yield* withRerender();
  yield* useEffect(() => {});

  const user = yield* useUser(id, count === 0);

  const _count: Expect<typeof count, number> = true;
  const _setCount: Expect<typeof setCount, SetState<number>> = true;
  const _doubled: Expect<typeof doubled, number> = true;
  const _box: Expect<typeof box.current, string[]> = true;
  const _id: Expect<typeof elementId, string> = true;
  const _onClick: Expect<typeof onClick, (step: number) => void> = true;
  const _theme: Expect<typeof theme, "light" | "dark"> = true;
  const _dark: Expect<typeof dark, boolean> = true;
  const _el: Expect<typeof el.current, HTMLDivElement | undefined> = true;
  const _peek: Expect<typeof peek, "light" | "dark"> = true;
  const _rerender: Expect<typeof rerender, () => void> = true;
  const _user: Expect<typeof user, User> = true;
  void [
    _count,
    _setCount,
    _doubled,
    _box,
    _id,
    _onClick,
    _theme,
    _dark,
    _el,
    _peek,
    _rerender,
    _user,
  ];

  if (!user) return yield "No user";
  return (
    <div ref={el} id={elementId} onClick={() => onClick(1)}>
      {user.name} {doubled}
    </div>
  );
}

/** A custom hook's early return can't break its declared result type. */
export function* useWrongResult(): ComponentGenerator<string> {
  // @ts-expect-error a number is not the declared string result
  return 42;
}

/**
 * Known limitation: without a return-type annotation, TypeScript reports
 * TS7057 ("'yield' expression implicitly results in an 'any' type") for
 * `return yield child`, so components that return early this way must
 * declare `: ComponentGenerator`.
 */
export function* Unannotated({ ready }: { ready: boolean }) {
  // @ts-expect-error TS7057 without a return-type annotation
  if (!ready) return yield <p>Not ready</p>;
  return <p>Ready</p>;
}
