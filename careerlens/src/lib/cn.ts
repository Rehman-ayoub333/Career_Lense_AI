/**
 * Joins class names, dropping falsy entries.
 *
 * A deliberately minimal implementation rather than `clsx` + `tailwind-merge`:
 * the variant maps in `components/ui` are written so that variants never emit
 * competing utilities for the same CSS property, which is what a merge library
 * exists to resolve. Two fewer dependencies for a nine-line function.
 */
export type ClassValue = string | false | null | undefined

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
