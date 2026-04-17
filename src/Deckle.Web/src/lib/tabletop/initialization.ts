// Build an initial TabletopState from the project's components and their
// linked data rows.
//
// Rules:
// • Each component with a linked data source becomes one entity per row.
// • Components without a data source produce a single entity.
// • Entities with a data source are placed face-down in a default "Deck"
//   stack zone; other entities are laid out on a freeform "Tableau" zone.
// • A small "Grid" zone is included to demonstrate the snap-to-grid layout.

import type { GameComponent } from '$lib/types';
import { hasDataSource, isEditableComponent, isDice } from '$lib/utils/componentTypes';
import type {
  Entity,
  EntityTemplate,
  FreeformZone,
  GridZone,
  StackZone,
  TabletopState,
  Zone
} from './types';

const TABLEAU_WIDTH = 1400;
const TABLEAU_HEIGHT = 700;
const TABLEAU_PADDING = 24;

const GRID_CELL = 80;
const GRID_COLUMNS = 6;
const GRID_ROWS = 4;

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
  /** componentId → parsed merge rows (or empty array if none). */
  componentRows: Record<string, Record<string, string>[]>;
}

export interface TabletopInitResult {
  state: TabletopState;
  templates: Record<string, EntityTemplate>;
}

function makeId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
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
 * Derive a human-readable label for an entity instance.
 * Uses common merge-field names (Name, Title) or falls back to the template name.
 */
function deriveLabel(templateName: string, mergeData: Record<string, string> | null): string {
  if (!mergeData) return templateName;
  for (const key of ['Name', 'Title', 'name', 'title']) {
    if (mergeData[key]) return mergeData[key];
  }
  return templateName;
}

export function buildInitialTabletop(input: TabletopInitInput): TabletopInitResult {
  const { components, componentRows } = input;

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
      isEditable: isEditableComponent(c)
    };
  }

  const tableau: FreeformZone = {
    id: 'zone-tableau',
    name: 'Tableau',
    type: 'freeform',
    x: 0,
    y: 0,
    width: TABLEAU_WIDTH,
    height: TABLEAU_HEIGHT,
    entityIds: []
  };

  const grid: GridZone = {
    id: 'zone-grid',
    name: 'Grid',
    type: 'grid',
    x: TABLEAU_WIDTH + 40,
    y: 0,
    width: GRID_COLUMNS * GRID_CELL,
    height: GRID_ROWS * GRID_CELL,
    cellWidth: GRID_CELL,
    cellHeight: GRID_CELL,
    columns: GRID_COLUMNS,
    entityIds: []
  };

  const deck: StackZone = {
    id: 'zone-deck',
    name: 'Deck',
    type: 'stack',
    x: TABLEAU_WIDTH + 40,
    y: GRID_ROWS * GRID_CELL + 40,
    width: 220,
    height: 320,
    faceDown: true,
    entityIds: []
  };

  const zones: Record<string, Zone> = {
    [tableau.id]: tableau,
    [grid.id]: grid,
    [deck.id]: deck
  };
  const zoneOrder = [tableau.id, grid.id, deck.id];

  const entities: Record<string, Entity> = {};

  // Simple row-packed layout inside the tableau for freeform entities.
  let cursorX = TABLEAU_PADDING;
  let cursorY = TABLEAU_PADDING;
  let rowHeight = 0;

  function placeInTableau(template: EntityTemplate): { x: number; y: number } {
    const { width, height } = getTemplateDisplaySize(template);
    if (cursorX + width > tableau.width - TABLEAU_PADDING) {
      cursorX = TABLEAU_PADDING;
      cursorY += rowHeight + TABLEAU_PADDING;
      rowHeight = 0;
    }
    const pos = { x: cursorX, y: cursorY };
    cursorX += width + TABLEAU_PADDING;
    rowHeight = Math.max(rowHeight, height);
    return pos;
  }

  for (const component of components) {
    const template = templates[component.id];
    const rows =
      hasDataSource(component) && componentRows[component.id]?.length > 0
        ? componentRows[component.id]
        : [null];

    for (const row of rows) {
      const mergeData: Record<string, string> | null = row;
      const entityId = makeId();
      const targetZone = mergeData ? deck : tableau;

      let x = 0;
      let y = 0;
      if (targetZone.type === 'freeform') {
        const pos = placeInTableau(template);
        x = pos.x;
        y = pos.y;
      }

      const entity: Entity = {
        instanceId: entityId,
        templateId: component.id,
        zoneId: targetZone.id,
        x,
        y,
        rotation: 0,
        isFlipped: targetZone.type === 'stack' ? targetZone.faceDown : false,
        mergeData,
        label: deriveLabel(component.name, mergeData)
      };

      entities[entityId] = entity;
      targetZone.entityIds.push(entityId);
    }
  }

  const state: TabletopState = {
    entities,
    zones,
    zoneOrder,
    selectedEntityId: null,
    selectedZoneId: null
  };

  return { state, templates };
}
