const queues = new Map<string, Promise<unknown>>();

/** Runs tasks that share a key one after another within this process, so read-change-write steps never interleave. */
export function inTurn<R>(key: string, run: () => Promise<R>): Promise<R> {
  const result = (queues.get(key) ?? Promise.resolve()).then(run);
  queues.set(
    key,
    result.catch(() => undefined),
  );
  return result;
}
