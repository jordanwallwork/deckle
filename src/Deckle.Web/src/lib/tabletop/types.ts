// Tabletop engine state model (Phase 1: Free Mode Sandbox)
//
// Follows an ECS-inspired shape: entities are plain serializable records
// referencing component templates (designed in Deckle), grouped into zones.
// The state is presentation-free so it can later be handed off to
// boardgame.io for Phase 3.

/**
 * Kinds of zone layouts the tabletop supports.
 * - freeform: entities positioned absolutely by (x, y) within the zone
 * - grid:     entities snap to a cell grid
 * - stack:    entities are piled; only the top is visible, with a count badge
 * - spread:   entities laid in a row or column with a configurable overlap
 * - group:    entities clustered loosely around the zone's midpoint; freely draggable
 */
export type ZoneType = 'freeform' | 'grid' | 'stack' | 'spread' | 'group';

/**
 * Settings that belong to a specific zone type but survive conversion to a
 * different type. When the user converts spread → grid → spread, the spread's
 * previous direction/overlap should come back rather than reset to defaults.
 */
export interface ZoneTypeSettingsCache {
  stack?: { faceDown: boolean; persistent: boolean };
  spread?: { direction: 'row' | 'column'; overlap: number };
  grid?: { cellWidth: number; cellHeight: number; columns: number };
}

export interface ZoneBase {
  id: string;
  name: string;
  type: ZoneType;
  /**
   * Position on the tabletop canvas (px). For top-level zones this is world
   * space; for zones nested inside a freeform zone it is parent-local space.
   */
  x: number;
  y: number;
  /** Zone dimensions (px). */
  width: number;
  height: number;
  /**
   * Ordered entity instance IDs in the zone. Order is meaningful for
   * stacks (top = last) and grids (cell index).
   */
  entityIds: string[];
  /** When true, the zone cannot be dragged or resized (except via edit mode). */
  locked: boolean;
  /**
   * Type-specific settings preserved across zone type conversions. Populated
   * by `changeZoneType`; empty on fresh zones.
   */
  typeSettings?: ZoneTypeSettingsCache;
  /**
   * Set when this zone is nested inside a freeform zone. The zone's x/y are
   * then relative to the parent's top-left rather than to the canvas origin.
   */
  parentZoneId?: string;
}

export interface FreeformZone extends ZoneBase {
  type: 'freeform';
  /**
   * IDs of zones nested directly inside this freeform zone, in render order
   * (last = on top). Absent or empty when there are no children.
   */
  childZoneIds?: string[];
  /**
   * When set, this zone renders the named template's design as its visual
   * background. Used for GameBoard and PlayerMat zones so that the
   * board/mat acts as a freeform container while still displaying its design.
   */
  backgroundTemplateId?: string;
}

export interface GridZone extends ZoneBase {
  type: 'grid';
  /** Cell dimensions in px. Entities snap to the nearest cell. */
  cellWidth: number;
  cellHeight: number;
  /** Number of columns; rows grow as needed. */
  columns: number;
}

export interface StackZone extends ZoneBase {
  type: 'stack';
  /** When true, the stack renders the back face of entities by default. */
  faceDown: boolean;
  /**
   * Display size (px) the stack expects its contained entities to be. Set at
   * creation time from the component type that seeded the stack, so the zone
   * stays sized to its intended contents even when empty.
   */
  defaultSize?: { width: number; height: number };
  /**
   * When false (default), the stack auto-dissolves once it drops to a single
   * entity — the last entity is promoted to a freeform zone and the stack is
   * removed. When true, the stack remains on the tabletop even when empty.
   */
  persistent: boolean;
}

export interface SpreadZone extends ZoneBase {
  type: 'spread';
  /**
   * Axis along which entities are laid out.
   * - 'row':    horizontal, left → right (entityIds[0] leftmost)
   * - 'column': vertical,   top  → bottom (entityIds[0] topmost)
   */
  direction: 'row' | 'column';
  /**
   * Number of pixels each entity overlaps the previous one along the
   * primary axis. `0` means entities sit edge-to-edge; values approaching
   * an entity's size produce a tight fan. Negative values introduce gaps.
   */
  overlap: number;
  /**
   * Display size (px) the spread expects its contained entities to be. Set
   * from the first entity that enters the spread so the layout stays stable
   * across adds/removes. Used by layout and insert-index math.
   */
  defaultSize?: { width: number; height: number };
}

export interface GroupZone extends ZoneBase {
  type: 'group';
}

export type Zone = FreeformZone | GridZone | StackZone | SpreadZone | GroupZone;

/**
 * A single instance placed on the tabletop. Multiple entities may share
 * the same templateId (e.g. one per data source row).
 */
export interface Entity {
  /** Unique per instance. */
  instanceId: string;
  /** References a Deckle component definition (GameComponent.id). */
  templateId: string;
  /** Zone currently containing this entity. */
  zoneId: string;
  /** Position within the zone (px). Ignored by stack layouts. */
  x: number;
  y: number;
  /** Rotation in degrees. */
  rotation: number;
  /** Whether the back face is currently shown. */
  isFlipped: boolean;
  /**
   * Merge data for this instance (populated from the linked data source).
   * Null if the template has no data source.
   */
  mergeData: Record<string, string> | null;
  /** Optional human-readable label; usually derived from mergeData or template. */
  label?: string;
  /** When true, the entity cannot be dragged. */
  locked: boolean;
  /** For Dice entities: the result of the last roll (1 – maxFaces). Absent until first roll. */
  diceValue?: number;
}

export interface TabletopState {
  entities: Record<string, Entity>;
  zones: Record<string, Zone>;
  /** Rendering order of zones on the canvas. */
  zoneOrder: string[];
  /** Selected entity instance (for keyboard shortcuts / context menus). */
  selectedEntityId: string | null;
  /** Selected zone (for zone-level operations like shuffle). */
  selectedZoneId: string | null;
  /**
   * Zone currently in edit mode — rendered with resize handles, a name
   * input, and a body drag that repositions it. Only one at a time.
   */
  editingZoneId: string | null;
}

/** Minimal template metadata cached alongside state so renderers can draw entities. */
export interface EntityTemplate {
  id: string;
  name: string;
  type: 'Card' | 'Dice' | 'GameBoard' | 'PlayerMat';
  /** Design-space pixel dimensions (at the component's DPI), including bleed. */
  widthPx: number;
  heightPx: number;
  /** Physical dimensions in mm (including bleed). Used to render entities at
   *  consistent real-world scale across component types. */
  widthMm: number;
  heightMm: number;
  /** For dice — they don't have widthPx/heightPx from the entity. */
  isEditable: boolean;
  /**
   * One entry per entity this template should spawn. Null entries are non-
   * data-source instances; object entries are merged row data. Always at
   * least one entry — templates without a data source have [null].
   */
  instances: (Record<string, string> | null)[];
}
