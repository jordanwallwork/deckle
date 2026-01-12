/**
 * Utility functions for converting between CSS flexbox values and user-friendly values
 */

/**
 * Convert CSS flexbox value to user-friendly value based on axis and direction
 */
export function cssToUserValue(
  cssValue: string,
  axis: 'main' | 'cross',
  isColumn: boolean
): string {
  if (axis === 'main') {
    // Main axis can have space-between, space-around
    const map: Record<string, string> = {
      'flex-start': isColumn ? 'top' : 'left',
      'flex-end': isColumn ? 'bottom' : 'right',
      center: 'center',
      'space-between': 'space-between',
      'space-around': 'space-around',
      'space-evenly': 'space-around' // Map space-evenly to space-around
    };
    return map[cssValue] || cssValue;
  } else {
    // Cross axis
    const map: Record<string, string> = {
      'flex-start': isColumn ? 'left' : 'top',
      'flex-end': isColumn ? 'right' : 'bottom',
      center: 'center',
      stretch: 'stretch',
      baseline: 'stretch' // Map baseline to stretch
    };
    return map[cssValue] || cssValue;
  }
}

/**
 * Convert user-friendly value to CSS flexbox value based on axis
 */
export function userValueToCss(userValue: string, axis: 'main' | 'cross'): string {
  if (axis === 'main') {
    const map: Record<string, string> = {
      left: 'flex-start',
      right: 'flex-end',
      top: 'flex-start',
      bottom: 'flex-end',
      center: 'center',
      'space-between': 'space-between',
      'space-around': 'space-around'
    };
    return map[userValue] || userValue;
  } else {
    const map: Record<string, string> = {
      left: 'flex-start',
      right: 'flex-end',
      top: 'flex-start',
      bottom: 'flex-end',
      center: 'center',
      stretch: 'stretch'
    };
    return map[userValue] || userValue;
  }
}

/**
 * Get alignment options for X axis based on flex direction
 */
export function getXOptions(isColumn: boolean) {
  if (isColumn) {
    return [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' },
      { value: 'stretch', label: 'Stretch' }
    ];
  } else {
    return [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' },
      { value: 'space-between', label: 'Space Between' },
      { value: 'space-around', label: 'Space Around' }
    ];
  }
}

/**
 * Get alignment options for Y axis based on flex direction
 */
export function getYOptions(isColumn: boolean) {
  if (isColumn) {
    return [
      { value: 'top', label: 'Top' },
      { value: 'center', label: 'Center' },
      { value: 'bottom', label: 'Bottom' },
      { value: 'space-between', label: 'Space Between' },
      { value: 'space-around', label: 'Space Around' }
    ];
  } else {
    return [
      { value: 'top', label: 'Top' },
      { value: 'center', label: 'Center' },
      { value: 'bottom', label: 'Bottom' },
      { value: 'stretch', label: 'Stretch' }
    ];
  }
}

/**
 * Get the grid cells for the alignment 3x3 grid
 */
export function getAlignmentGridCells(isColumn: boolean) {
  const cells: Array<{ x: string; y: string }> = [];

  // Only show the 3x3 grid with basic alignments
  const xValues = isColumn ? ['left', 'center', 'right'] : ['left', 'center', 'right'];
  const yValues = isColumn ? ['top', 'center', 'bottom'] : ['top', 'center', 'bottom'];

  for (const y of yValues) {
    for (const x of xValues) {
      cells.push({ x, y });
    }
  }

  return cells;
}
