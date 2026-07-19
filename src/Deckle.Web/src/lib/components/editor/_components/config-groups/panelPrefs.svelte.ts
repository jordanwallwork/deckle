import type { PropertyGroup } from '../../capabilities';

/**
 * Panel UX preferences remembered ACROSS element selections (ADR-0001 story 22).
 * Module-level rune state so both the desktop panel and the mobile sheet share
 * one memory of which accordion groups are open.
 */

interface PanelPrefs {
  /** Groups the user has expanded (Identity is always open). */
  openGroups: Set<PropertyGroup>;
}

export const panelPrefs = $state<PanelPrefs>({
  openGroups: new Set<PropertyGroup>(['position', 'size', 'layout'])
});

export function toggleGroupOpen(group: PropertyGroup) {
  const next = new Set(panelPrefs.openGroups);
  if (next.has(group)) next.delete(group);
  else next.add(group);
  panelPrefs.openGroups = next;
}

export function isGroupOpen(group: PropertyGroup): boolean {
  return panelPrefs.openGroups.has(group);
}
