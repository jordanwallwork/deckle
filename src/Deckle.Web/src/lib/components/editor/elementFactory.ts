import type { TemplateElement, ElementType, ShapeElement, GridElement } from './types';

/**
 * Factory for new template elements (ADR-0001 D4, "unset-first defaults").
 *
 * New elements are nearly-empty: only structural, data, and size fields are
 * stamped. Cosmetic styling defaults (opacity, visibilityMode, container
 * display/flex, text fontSize/color, grid cell fill/border) are intentionally
 * left unset — their effective values live in `effectiveDefaults.ts` and are
 * resolved by the renderers, so an omitted property renders identically to the
 * value the factory used to stamp.
 *
 * Size (`dimensions` 100×100) is kept: a newly-created element needs a footprint
 * to be usable on the canvas.
 */
export function createElementOfType(type: ElementType): TemplateElement {
  if (type === 'container') {
    return {
      id: crypto.randomUUID(),
      type: 'container',
      children: []
    };
  } else if (type === 'text') {
    return {
      id: crypto.randomUUID(),
      type: 'text',
      content: 'New Text'
    };
  } else if (type === 'iterator') {
    return {
      id: crypto.randomUUID(),
      type: 'iterator',
      iteratorName: 'i',
      fromExpression: '1',
      toExpression: '3',
      children: []
    };
  } else if (type === 'shape') {
    return {
      id: crypto.randomUUID(),
      type: 'shape',
      shapeType: 'circle',
      dimensions: { width: 100, height: 100 },
      children: []
    } as ShapeElement;
  } else if (type === 'grid') {
    return {
      id: crypto.randomUUID(),
      type: 'grid',
      variant: 'checkerboard',
      itemSize: 20,
      cells: [],
      children: [],
      dimensions: { width: 100, height: 100 }
    } as GridElement;
  } else {
    // image
    return {
      id: crypto.randomUUID(),
      type: 'image',
      imageId: '',
      dimensions: { width: 100, height: 100 }
    };
  }
}
