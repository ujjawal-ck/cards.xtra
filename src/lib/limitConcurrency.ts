/**
 * limitConcurrency — runs async tasks with at most `max` in flight. The other
 * tasks wait in order (first in, first out). A task that fails still frees
 * its slot. Used by the Orders list to fetch order details 4 at a time.
 */
export function limitConcurrency(max: number) {
  const limit = Math.max(1, Math.floor(max));
  let active = 0;
  const queue: (() => void)[] = [];

  const next = () => {
    if (active >= limit) return;
    const start = queue.shift();
    if (!start) return;
    active += 1;
    start();
  };

  return function run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        Promise.resolve()
          .then(task)
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            next();
          });
      });
      next();
    });
  };
}
