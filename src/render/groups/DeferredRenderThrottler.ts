import { createResolvable } from "../../create-resolvable";

export class DeferredRenderThrottler {
  #workYieldDeadline = 0;
  readonly #chunkMs: number;
  readonly #awaitChannel = new MessageChannel();

  constructor(chunkMs: number) {
    this.#chunkMs = chunkMs;
  }
  onRenderStart() {
    this.#workYieldDeadline = Date.now() + this.#chunkMs;
  }

  async throttle(): Promise<void> {
    if (Date.now() <= this.#workYieldDeadline) return;
    const { promise, resolve } = createResolvable<unknown>();
    const { port1, port2 } = this.#awaitChannel;
    port1.onmessage = resolve;
    port2.postMessage(null);
    await promise;
    this.#workYieldDeadline = Date.now() + this.#chunkMs;
  }

  shouldThrottle(): boolean {
    return Date.now() >= this.#workYieldDeadline;
  }
}
