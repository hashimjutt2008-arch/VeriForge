export function runReport<T>(
  request: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../../workers/report.worker.ts", import.meta.url),
      { type: "module" },
    );
    const stop = () => {
      worker.terminate();
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      stop();
      reject(new DOMException("Cancelled", "AbortError"));
    };
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event: MessageEvent<{ result: T; error?: string }>) => {
      stop();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.result);
    };
    worker.onerror = () => {
      stop();
      reject(
        new Error(
          "The local report worker could not finish. Reload or try a smaller list.",
        ),
      );
    };
    worker.postMessage(request);
  });
}
