import type { PropertyGroup } from '../../capabilities';

/**
 * Panel UX preferences remembered ACROSS element selections (ADR-0001 story 22).
 * Module-level rune state so both the desktop panel and the mobile sheet share
 * one memory: which accordion groups are open (variant A) and which tab is
 * active (variant B).
 */

/** Which panel variant is shown — the dev toggle / decision gate (D5). */
export type PanelVariant = 'a' | 'b';

interface PanelPrefs {
  variant: PanelVariant;
  /** Variant A: groups the user has expanded (Identity is always open). */
  openGroups: Set<PropertyGroup>;
  /** Variant B: the active tab. */
  activeTab: PropertyGroup;
}

export const panelPrefs = $state<PanelPrefs>({
  variant: 'a',
  openGroups: new Set<PropertyGroup>(['position', 'size', 'layout']),
  activeTab: 'position'
});

export function setVariant(v: PanelVariant) {
  panelPrefs.variant = v;
}

export function toggleGroupOpen(group: PropertyGroup) {
  const next = new Set(panelPrefs.openGroups);
  if (next.has(group)) next.delete(group);
  else next.add(group);
  panelPrefs.openGroups = next;
}

export function isGroupOpen(group: PropertyGroup): boolean {
  return panelPrefs.openGroups.has(group);
}

export function setActiveTab(group: PropertyGroup) {
  panelPrefs.activeTab = group;
}
