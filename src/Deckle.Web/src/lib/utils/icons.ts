import type { ElementType } from '$lib/components/editor/types';

/**
 * Get SVG path data for element icon based on element type
 */
export function getElementIcon(type: ElementType): string {
  switch (type) {
    case 'container':
      return 'M2 2h12v12H2z';
    case 'text':
      return 'M4 3h8M8 3v10M6 13h4';
    case 'image':
      return 'M2 2h12v12H2zM5.5 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM2 11l3-3 3 3 3-3 3 3';
    case 'iterator':
      return 'M4 4h8M4 8h8M4 12h8M2 4v0M2 8v0M2 12v0';
    default:
      return '';
  }
}
