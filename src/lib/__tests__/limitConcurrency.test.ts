import { limitConcurrency } from '../limitConcurrency';

/** A task that resolves (or rejects) only when the test says so. */
function deferred() {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('limitConcurrency', () => {
  it('never runs more than 4 at once, and runs every task in order', async () => {
    const run = limitConcurrency(4);
    let active = 0;
    let peak = 0;
    const started: number[] = [];
    const gates = Array.from({ length: 10 }, () => deferred());
    const all = gates.map((g, i) =>
      run(async () => {
        active += 1;
        peak = Math.max(peak, active);
        started.push(i);
        await g.promise;
        active -= 1;
        return i;
      })
    );

    await flush();
    expect(started).toEqual([0, 1, 2, 3]);
    // Finish them one by one; each frees exactly one slot.
    for (const g of gates) {
      g.resolve();
      await flush();
      expect(active).toBeLessThanOrEqual(4);
    }
    await expect(Promise.all(all)).resolves.toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(peak).toBe(4);
    expect(started).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('a failed task rejects its own promise and frees its slot', async () => {
    const run = limitConcurrency(1);
    const failing = run(() => Promise.reject(new Error('boom')));
    const after = run(async () => 'ran');
    await expect(failing).rejects.toThrow('boom');
    await expect(after).resolves.toBe('ran');
  });

  it('a task that throws before returning a promise also frees its slot', async () => {
    const run = limitConcurrency(1);
    const failing = run(() => {
      throw new Error('sync');
    });
    await expect(failing).rejects.toThrow('sync');
    await expect(run(async () => 1)).resolves.toBe(1);
  });
});
