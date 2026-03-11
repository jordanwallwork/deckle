import type { ZoneDef } from './types';

/** Canonical preset zone definitions for the tabletop canvas (id, label, and default layout). */
export const PRESET_ZONE_DEFS: ZoneDef[] = [
  { id: 'play_area', label: 'Play Area', x: 40, y: 40, minWidth: 900, minHeight: 580 },
  { id: 'sideboard', label: 'Sideboard', x: 980, y: 40, minWidth: 340, minHeight: 440 },
];

/**
 * Blockly dropdown options for the zone_preset block.
 * Includes 'game_box' which is not a canvas zone but a valid move target
 * (returning components to the sidebar).
 */
export const PRESET_ZONE_BLOCKLY_OPTIONS: [string, string][] = [
  ...PRESET_ZONE_DEFS.map((z): [string, string] => [z.label, z.id]),
  ['Game Box', 'game_box'],
];
