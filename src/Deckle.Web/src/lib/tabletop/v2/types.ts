// Tabletop v2 state model — the pile-based rework (see SPEC.md).
//
// Everything on the table is a Pile of one or more Cards; zones are regions
// with layout behaviour; the table itself is the root region. State is plain
// serializable data so all logic stays below the pure-function testing seam.

/**
 * A single item identity + face state. Cards never have coordinates —
 * position belongs to the pile that contains them.
 */
export interface Card {
  /** Unique per card instance. */
  id: string;
  /** References a Deckle component definition (Template.id / GameComponent.id). */
  templateId: string;
  /**
   * Merge data for this instance (populated from the linked data source).
   * Null if the template has no data source.
   */
  mergeData: Record<string, string> | null;
  /** Optional human-readable label; usually derived from mergeData or template. */
  label?: string;
  /** Whether the back face is currently shown. */
  isFlipped: boolean;
  /** Rotation in degrees, normalized to [0, 360). Per-card — piles have no rotation. */
  rotation: number;
  /** For dice: the result of the last roll (1 – faces). Absent until first roll. */
  diceValue?: number;
}

/**
 * The physical object sitting on the table: an ordered stack of cards.
 * A lone card is a pile of one.
 *
 * Position semantics: `x`/`y` is the CENTRE of the pile's footprint —
 * world-space when `zoneId` is null (the pile sits on the open table),
 * zone-local otherwise. Centre-anchoring keeps the pile visually stable
 * when rotations or card sizes change its derived footprint.
 */
export interface Pile {
  /** Unique per pile. */
  id: string;
  /** Containing zone, or null when the pile sits on the root table. */
  zoneId: string | null;
  x: number;
  y: number;
  /** When true the pile is fully inert (not draggable/mergeable), but clickable. */
  locked: boolean;
  /** Ordered card ids; last = top of the pile. Never empty after a commit. */
  cardIds: string[];
}

/**
 * The four region kinds. `stack` is gone — the stack concept lives entirely
 * in piles.
 */
export type ZoneType = 'freeform' | 'grid' | 'spread' | 'group';

/**
 * Type-specific settings preserved across zone type conversions, so
 * converting spread → grid → spread restores the spread's configuration.
 */
export interface ZoneTypeSettingsCache {
  spread?: { direction: 'row' | 'column'; overlap: number };
  grid?: { cellWidth: number; cellHeight: number; columns: number };
}

export interface ZoneBase {
  id: string;
  name: string;
  type: ZoneType;
  /**
   * Top-left position (px). World-space for top-level zones; parent-local
   * for zones nested inside a freeform zone.
   */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Ordered pile ids contained in this zone (order = render/spread order). */
  pileIds: string[];
  /** When true the zone refuses move/edit/delete and its drops. */
  locked: boolean;
  /** Per-type settings surviving type conversion. Empty on fresh zones. */
  typeSettings?: ZoneTypeSettingsCache;
  /** Set when nested inside a freeform zone; x/y are then parent-local. */
  parentZoneId?: string;
}

export interface FreeformZone extends ZoneBase {
  type: 'freeform';
  /** Nested zones in render order (last = on top). Freeform zones only. */
  childZoneIds?: string[];
  /** Renders the named template's design as the zone background (boards/mats). */
  backgroundTemplateId?: string;
}

export interface GridZone extends ZoneBase {
  type: 'grid';
  cellWidth: number;
  cellHeight: number;
  columns: number;
}

export interface SpreadZone extends ZoneBase {
  type: 'spread';
  direction: 'row' | 'column';
  /** Px each pile overlaps the previous along the primary axis. */
  overlap: number;
}

export interface GroupZone extends ZoneBase {
  type: 'group';
}

export type Zone = FreeformZone | GridZone | SpreadZone | GroupZone;

/** What is currently selected. Piles are the selection atom. */
export type Selection =
  | { kind: 'none' }
  | { kind: 'piles'; pileIds: string[] }
  | { kind: 'zone'; zoneId: string };

export interface TabletopState {
  cards: Record<string, Card>;
  piles: Record<string, Pile>;
  zones: Record<string, Zone>;
  /** Render order of top-level zones. */
  zoneOrder: string[];
  /** Render order of piles sitting on the root table (last = on top). */
  rootPileIds: string[];
  selection: Selection;
  /** Zone currently in edit mode (transactional edit session). */
  editingZoneId: string | null;
}

/**
 * Template metadata + capability flags, computed once at build. Downstream
 * code reads the flags — never component types.
 */
export interface Template {
  id: string;
  name: string;
  /** Physical dimensions in mm (including bleed); the source of display scale. */
  widthMm: number;
  heightMm: number;
  /** Design-space pixel dimensions (at the component's DPI), including bleed. */
  widthPx: number;
  heightPx: number;
  /** Cards merge into piles; dice/boards do not. */
  mergeable: boolean;
  /** Boards/mats spawn as background-rendered freeform regions. */
  isContainer: boolean;
  /** False for dice — F skips them. */
  flippable: boolean;
  /** Dice only: number of faces rolling can produce. */
  faces?: number;
  /**
   * One entry per card this template should spawn. Null entries are
   * non-data-source instances; object entries are merged row data.
   * Always at least one entry.
   */
  instances: (Record<string, string> | null)[];
}

export type Templates = Record<string, Template>;
