/**
 * DS-ADD(ds-figma-1, 2026-11-17): fixed cell sizes and the column selection model for CompareTable.
 * Figma: Q7235KVU3sU3HOTiibOXhv nodes 1192:185944..185948 (compare-table-cell). Sizes are fixed so the pinned column and the scrolling
 * columns line up without measuring layout.
 * Rollback: delete this file, its test, and src/molecules/CompareTable.tsx.
 */
import { spacing } from '../tokens/spacing';

/** Figma: value cell 88 x 88, header cell 88 x 52, hero cell 146.32 wide x 172 high. Values off the spacing scale are composed. */
export const COMPARE_TABLE = {
  valueW: spacing[64] + spacing[24], // 88
  valueH: spacing[64] + spacing[24], // 88
  headerH: spacing[48] + spacing[4], // 52
  heroW: spacing[128] + spacing[16] + spacing[2], // 146 (Figma 146.32)
  heroH: spacing[128] + spacing[32] + spacing[12], // 172
} as const;

/** Column offset (px) that puts column `index` at the left edge of the scrolling area. */
export function columnOffset(index: number): number {
  return Math.max(0, Math.floor(Number.isFinite(index) ? index : 0)) * COMPARE_TABLE.valueW;
}

/** Tapping the selected column clears it; tapping another selects it. */
export function nextSelected(current: string | null | undefined, tapped: string): string | null {
  return current === tapped ? null : tapped;
}

/** Look-up for one column: is it the selected one. A selected id that is not in the list selects nothing. */
export function isSelectedColumn(columnId: string, selectedId: string | null | undefined, ids: string[]): boolean {
  return selectedId != null && ids.includes(selectedId) && selectedId === columnId;
}
