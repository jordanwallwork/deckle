import type { TemplateElement, ElementType, ShapeElement } from './types';

/**
 * Factory function to create new template elements with default values
 */
export function createElementOfType(type: ElementType): TemplateElement {
  if (type === 'container') {
    return {
      id: crypto.randomUUID(),
      type: 'container',
      visibilityMode: 'show',
      opacity: 1,
      display: 'flex',
      flexConfig: {
        direction: 'column',
        wrap: 'nowrap',
        justifyContent: 'flex-start',
        alignItems: 'flex-start'
      },
      children: []
    };
  } else if (type === 'text') {
    return {
      id: crypto.randomUUID(),
      type: 'text',
      visibilityMode: 'show',
      opacity: 1,
      content: 'New Text',
      fontSize: 16,
      color: '#000000'
    };
  } else if (type === 'iterator') {
    return {
      id: crypto.randomUUID(),
      type: 'iterator',
      visibilityMode: 'show',
      opacity: 1,
      iteratorName: 'i',
      fromExpression: '1',
      toExpression: '3',
      children: []
    };
  } else if (type === 'shape') {
    return {
      id: crypto.randomUUID(),
      type: 'shape',
      visibilityMode: 'show',
      opacity: 1,
      shapeType: 'circle',
      dimensions: { width: 100, height: 100 },
      children: []
    } as ShapeElement;
  } else {
    // image
    return {
      id: crypto.randomUUID(),
      type: 'image',
      visibilityMode: 'show',
      opacity: 1,
      imageId: '',
      dimensions: { width: 100, height: 100 }
    };
  }
}
