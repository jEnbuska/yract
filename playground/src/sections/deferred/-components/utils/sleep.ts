export default function sleep(ms: number = 0, signal?: AbortSignal) {
  return new Promise<void>((res) => {
    setTimeout(() => {
      if (signal?.aborted) return;
      res();
    }, ms);
  });
}
