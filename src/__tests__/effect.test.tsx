import { describe, expect, it } from "vitest";
import { useEffect, useState } from "yract";
import { flush } from "./utils/flush";
import { mount } from "./utils/dom";

describe("useEffect", () => {
  it("runs after every render when it has no dependency list", async () => {
    let runs = 0;
    let bump!: () => void;
    function* Counter() {
      const [n, setN] = yield* useState(0);
      bump = () => setN((c) => c + 1);
      yield* useEffect(() => {
        runs++;
      });
      return <b>{n}</b>;
    }
    await mount(<Counter />);
    expect(runs).toBe(1);
    bump();
    await flush();
    bump();
    await flush();
    expect(runs).toBe(3);
  });

  it("runs once with an empty dependency list", async () => {
    let runs = 0;
    let bump!: () => void;
    function* Counter() {
      const [n, setN] = yield* useState(0);
      bump = () => setN((c) => c + 1);
      yield* useEffect(() => {
        runs++;
      }, []);
      return <b>{n}</b>;
    }
    await mount(<Counter />);
    bump();
    await flush();
    bump();
    await flush();
    expect(runs).toBe(1);
  });

  it("re-runs only when a dependency changes", async () => {
    const seen: number[] = [];
    let setA!: (n: number) => void;
    let setB!: (n: number) => void;
    function* Pair() {
      const [a, sa] = yield* useState(0);
      const [b, sb] = yield* useState(0);
      setA = sa;
      setB = sb;
      yield* useEffect(() => {
        seen.push(a);
      }, [a]);
      return (
        <b>
          {a}/{b}
        </b>
      );
    }
    await mount(<Pair />);
    setB(1);
    await flush();
    setA(5);
    await flush();
    expect(seen).toEqual([0, 5]);
  });
});
