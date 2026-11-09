/**
 * validate.ts — check a response against its contract without breaking the app.
 *
 * `checkContract` never throws and never changes the data: our mappers are
 * already defensive, so a drifted response should degrade (blank field),
 * not crash. What changes is visibility: every mismatch is reported once per
 * endpoint per session to the installed reporter (Crashlytics in builds,
 * console in dev), tagged with the endpoint and the failing field paths.
 */
import type { ZodTypeAny } from 'zod';

export interface ContractViolation {
  /** Logical endpoint name, e.g. "users/earnings". */
  endpoint: string;
  /** Up to 5 failing paths with the zod message, e.g. "data.0.attributes.name: Required". */
  issues: string[];
}

let reporter: (v: ContractViolation) => void = (v) => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(`[contract] ${v.endpoint} drifted:`, v.issues.join(' | '));
  }
};
const reported = new Set<string>();

/** Install the reporter (App.js wires Crashlytics). */
export function setContractReporter(fn: (v: ContractViolation) => void): void {
  reporter = fn;
}

/** Test seam: forget which endpoints were already reported. */
export function __resetContractReports(): void {
  reported.clear();
}

/** Returns true when `data` matches; reports (once) and returns false otherwise. */
export function checkContract(endpoint: string, schema: ZodTypeAny, data: unknown): boolean {
  const result = schema.safeParse(data);
  if (result.success) return true;
  const issues = result.error.issues
    .slice(0, 5)
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
  const key = `${endpoint}|${issues[0] ?? ''}`;
  if (!reported.has(key)) {
    reported.add(key);
    try {
      reporter({ endpoint, issues });
    } catch {
      // reporting must never break the call
    }
  }
  return false;
}

/** Validate and pass the data through unchanged (for use in `return` statements). */
export function contract<T>(endpoint: string, schema: ZodTypeAny, data: T): T {
  checkContract(endpoint, schema, data);
  return data;
}
