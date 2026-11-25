// Storybook stub for expo-secure-store: an in-memory Map. Nothing persists.
// The Map is module-level, so it survives between stories. The harness calls
// resetSecureStore() and then seedSecureStore() on every mount, BEFORE
// AuthProvider reads it.
const mem = new Map<string, string>();

export async function getItemAsync(k: string) { return mem.get(k) ?? null; }
export async function setItemAsync(k: string, v: string) { mem.set(k, v); }
export async function deleteItemAsync(k: string) { mem.delete(k); }
export function getItem(k: string) { return mem.get(k) ?? null; }
export function setItem(k: string, v: string) { mem.set(k, v); }
export async function isAvailableAsync() { return true; }

/** Remove every key. */
export function resetSecureStore(): void {
  mem.clear();
}

/** Write keys synchronously, so they exist before the first async read. A null value deletes the key. */
export function seedSecureStore(values: Record<string, string | null | undefined>): void {
  for (const [k, v] of Object.entries(values)) {
    if (v == null) mem.delete(k);
    else mem.set(k, v);
  }
}

/** Copy of the store, for debugging in a story. */
export function dumpSecureStore(): Record<string, string> {
  return Object.fromEntries(mem.entries());
}
