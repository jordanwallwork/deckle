import { mmToPx } from '$lib/utils/size.utils';

/**
 * A length unit. The internal name is `'percent'`; the storage/serialization
 * boundary maps it to/from the stored `'%'` token.
 */
export type Unit = 'px' | 'mm' | 'percent';

/**
 * A strongly-typed length. This is a WORKING/domain type only — the
 * stored/serialized format remains `number | string` (see `toDimension` /
 * `toStored`). Absence is represented as `undefined`, never a `{unit:'unset'}`
 * member (the app is unset-first).
 */
export interface Dimension {
  readonly unit: Unit;
  readonly value: number;
}

export const px = (v: number): Dimension => ({ unit: 'px', value: v });
export const mm = (v: number): Dimension => ({ unit: 'mm', value: v });
export const percent = (v: number): Dimension => ({ unit: 'percent', value: v });

// ============================================================================
// Boundary: parse from / serialize to the stored `number | string` format.
// ============================================================================

/**
 * Parses the stored representation of a length into a `Dimension`.
 *
 * Storage convention: a plain number means px; a string carries its unit.
 * - `number` → `px(number)`
 * - `"5mm"` → `mm(5)`, `"50%"` → `percent(50)`, `"10px"` → `px(10)`
 * - a bare numeric string `"12"` → `px(12)`
 * - unparseable / empty / `undefined` → `undefined`
 */
export function toDimension(raw: number | string | undefined): Dimension | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw === 'number') return px(raw);

  const trimmed = raw.trim();
  if (trimmed === '') return undefined;

  const match = trimmed.match(/^(-?\d+\.?\d*)\s*(px|mm|%)?$/);
  if (!match) return undefined;

  const value = Number.parseFloat(match[1]);
  if (Number.isNaN(value)) return undefined;

  const unitToken = match[2];
  if (unitToken === 'mm') return mm(value);
  if (unitToken === '%') return percent(value);
  // 'px' or no unit (bare numeric string) → px
  return px(value);
}

/**
 * Serializes a `Dimension` back to the stored `number | string` format.
 *
 * Canonicalization: px serializes to a plain **number** (not `"10px"`), so
 * `toStored(toDimension("10px"))` yields `10`. mm → `"<v>mm"`,
 * percent → `"<v>%"`, `undefined` → `undefined`.
 */
export function toStored(d: Dimension | undefined): number | string | undefined {
  if (d === undefined) return undefined;
  switch (d.unit) {
    case 'px':
      return d.value;
    case 'mm':
      return `${d.value}mm`;
    case 'percent':
      return `${d.value}%`;
  }
}

// ============================================================================
// Operations
// ============================================================================

/**
 * Renders a `Dimension` as a CSS length string.
 * - px → `"<v>px"`
 * - mm → `"<mmToPx(v,dpi)>px"` if `dpi` given, else `"<v>mm"`
 * - percent → `"<v>%"`
 * - undefined → undefined
 */
export function toCss(d: Dimension | undefined, dpi?: number): string | undefined {
  if (d === undefined) return undefined;
  switch (d.unit) {
    case 'px':
      return `${d.value}px`;
    case 'mm':
      return dpi !== undefined ? `${mmToPx(d.value, dpi)}px` : `${d.value}mm`;
    case 'percent':
      return `${d.value}%`;
  }
}

/**
 * Converts a `Dimension` to a numeric pixel value.
 * - px → v
 * - mm → `mmToPx(v, dpi)` (dpi required for a correct answer)
 * - percent → `(v/100)*referencePx` when `referencePx` is given, else `undefined`
 *   (an explicit reference is required — no silent wrong math).
 * - undefined → undefined
 */
export function toPx(d: Dimension | undefined, dpi?: number, referencePx?: number): number | undefined {
  if (d === undefined) return undefined;
  switch (d.unit) {
    case 'px':
      return d.value;
    case 'mm':
      return mmToPx(d.value, dpi ?? 0);
    case 'percent':
      return referencePx != null ? (d.value / 100) * referencePx : undefined;
  }
}
