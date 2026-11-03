/**
 * nameInitials — avatar initials from a display name.
 *
 *   "Praveen"              → "P"   (one word: first letter)
 *   "Praveen Singh"        → "PS"  (first + last initial)
 *   "Praveen Singh Yadav"  → "PY"  (first + last initial; middle names ignored)
 *
 * Returns undefined for an empty / whitespace-only name so callers can fall
 * back to a default avatar.
 */
export function nameInitials(name?: string | null): string | undefined {
  if (!name) return undefined;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return (first + last).toUpperCase();
}
