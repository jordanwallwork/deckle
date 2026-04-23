// Build an initial TabletopState from the project's components.
//
// The play space starts with a single "Play Area" freeform zone — users
// drag components from the sidebar onto the tabletop, and create
// additional zones via the canvas context menu.

import type { GameComponent } from '$lib/types';
import { isEditableComponent, isDice } from '$lib/utils/componentTypes';
import type { EntityTemplate, FreeformZone, TabletopState, Zone } from './types';

const PLAY_AREA_WIDTH = 1400;
const PLAY_AREA_HEIGHT = 700;

/**
 * Default physical size for dice entities on the tabletop (standard d6).
 * Dice components don't carry mm/px dimensions so we assume a plausible
 * physical size and derive pixel dimensions from `TABLETOP_PX_PER_MM`.
 */
export const DICE_SIZE_MM = 16;

/**
 * How many on-screen pixels represent one millimetre of physical component.
 * All entity sizes on the tabletop are derived from their physical mm
 * dimensions times this factor, so cards, dice and player mats retain the
 * correct relative scale.
 */
export const TABLETOP_PX_PER_MM = 2;

export const DICE_SIZE_PX = DICE_SIZE_MM * TABLETOP_PX_PER_MM;

export interface TabletopInitInput {
  components: GameComponent[];
  /**
   * Data source rows keyed by component id. Omit or pass an empty array
   * for components without a data source.
   */
  componentRows?: Record<string, Record<string, string>[]>;
}

export interface TabletopInitResult {
  state: TabletopState;
  templates: Record<string, EntityTemplate>;
}

interface TemplateDimensions {
  widthPx: number;
  heightPx: number;
  widthMm: number;
  heightMm: number;
}

function getTemplateDimensions(c: GameComponent): TemplateDimensions {
  if (isEditableComponent(c)) {
    return {
      widthPx: c.dimensions.widthPx + 2 * c.dimensions.bleedPx,
      heightPx: c.dimensions.heightPx + 2 * c.dimensions.bleedPx,
      widthMm: c.dimensions.widthMm + 2 * c.dimensions.bleedMm,
      heightMm: c.dimensions.heightMm + 2 * c.dimensions.bleedMm
    };
  }
  if (isDice(c)) {
    return {
      widthPx: DICE_SIZE_PX,
      heightPx: DICE_SIZE_PX,
      widthMm: DICE_SIZE_MM,
      heightMm: DICE_SIZE_MM
    };
  }
  // Fallback: assume a 50mm square placeholder.
  return { widthPx: 100, heightPx: 100, widthMm: 50, heightMm: 50 };
}

/** Display size (px) for an entity rendered at physical scale on the tabletop. */
export function getTemplateDisplaySize(template: EntityTemplate): {
  width: number;
  height: number;
} {
  return {
    width: template.widthMm * TABLETOP_PX_PER_MM,
    height: template.heightMm * TABLETOP_PX_PER_MM
  };
}

/**
 * Expand data source rows into one instance per row, honouring a "Num" field
 * for duplicates (matches the export preview's behaviour). Falls back to a
 * single null instance when no rows are provided.
 */
function buildInstances(
  rows: Record<string, string>[] | undefined
): (Record<string, string> | null)[] {
  if (!rows || rows.length === 0) return [null];
  const instances: (Record<string, string> | null)[] = [];
  for (const row of rows) {
    const numCopies = row.Num ? Math.max(1, Number.parseInt(row.Num, 10) || 1) : 1;
    for (let i = 0; i < numCopies; i++) {
      instances.push(row);
    }
  }
  return instances.length > 0 ? instances : [null];
}

export function buildInitialTabletop(input: TabletopInitInput): TabletopInitResult {
  const { components, componentRows = {} } = input;

  const templates: Record<string, EntityTemplate> = {};
  for (const c of components) {
    const { widthPx, heightPx, widthMm, heightMm } = getTemplateDimensions(c);
    templates[c.id] = {
      id: c.id,
      name: c.name,
      type: c.type,
      widthPx,
      heightPx,
      widthMm,
      heightMm,
      isEditable: isEditableComponent(c),
      instances: isDice(c)
        ? Array.from({ length: Math.max(1, c.number) }, () => null)
        : buildInstances(componentRows[c.id])
    };
  }

  const playArea: FreeformZone = {
    id: 'zone-play-area',
    name: 'Play Area',
    type: 'freeform',
    x: 0,
    y: 0,
    width: PLAY_AREA_WIDTH,
    height: PLAY_AREA_HEIGHT,
    entityIds: [],
    locked: false
  };

  const zones: Record<string, Zone> = {
    [playArea.id]: playArea
  };
  const zoneOrder = [playArea.id];

  const state: TabletopState = {
    entities: {},
    zones,
    zoneOrder,
    selectedEntityId: null,
    selectedZoneId: null,
    editingZoneId: null
  };

  return { state, templates };
}
