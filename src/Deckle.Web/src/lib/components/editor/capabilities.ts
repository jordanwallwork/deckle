import type { ElementType } from './types';

/**
 * Capability-driven property groups (ADR-0001 D1).
 *
 * Each element type declares which *visual* property groups it exposes. The
 * config panel renders one shared group control per granted group; type-specific
 * fields (text content, image source, shape type, iterator range, grid cell
 * settings) render separately and are always pinned, so they are NOT part of
 * this list.
 *
 * Pure module — no Svelte, no side effects. This is the single source of truth
 * for the type→group matrix; both panel variants and the set-indicator helper
 * consume it.
 */
export type PropertyGroup =
  | 'identity'
  | 'position'
  | 'size'
  | 'layout'
  | 'typography'
  | 'background'
  | 'border'
  | 'effects';

/**
 * Ordered groups each element type exposes. Iterator is a logical repeater, not
 * a visual box (ADR-0001 D2), so it gets `identity` only — its range fields
 * render as pinned type-specific fields, never as a styling group.
 */
export const ELEMENT_GROUPS: Record<ElementType, PropertyGroup[]> = {
  container: ['identity', 'position', 'size', 'layout', 'background', 'border', 'effects'],
  text: ['identity', 'position', 'size', 'layout', 'typography', 'background', 'border', 'effects'],
  image: ['identity', 'position', 'size', 'layout', 'background', 'border', 'effects'],
  shape: ['identity', 'position', 'size', 'layout', 'background', 'border', 'effects'],
  grid: ['identity', 'position', 'size', 'layout', 'background', 'border', 'effects'],
  iterator: ['identity']
};

/** Groups granted to an element type, in canonical order. */
export function groupsForType(type: ElementType): PropertyGroup[] {
  return ELEMENT_GROUPS[type];
}

/** Whether an element type exposes a given group. */
export function typeHasGroup(type: ElementType, group: PropertyGroup): boolean {
  return ELEMENT_GROUPS[type].includes(group);
}

/**
 * Presentation metadata for a group — the human label and a compact single-glyph
 * icon (used by the vertical tab rail, variant B). Icons are plain text glyphs
 * to avoid depending on the (small) shared icon set.
 */
export interface GroupMeta {
  label: string;
  /** Single glyph for the tab rail. */
  glyph: string;
}

export const GROUP_META: Record<PropertyGroup, GroupMeta> = {
  identity: { label: 'Identity', glyph: 'ID' },
  position: { label: 'Position', glyph: '✛' },
  size: { label: 'Size', glyph: '⬍' },
  layout: { label: 'Layout', glyph: '☷' },
  typography: { label: 'Typography', glyph: 'A' },
  background: { label: 'Background', glyph: '▨' },
  border: { label: 'Border', glyph: '▢' },
  effects: { label: 'Effects', glyph: '✦' }
};
