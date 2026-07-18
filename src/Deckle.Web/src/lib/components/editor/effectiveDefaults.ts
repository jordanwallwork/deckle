import type {
  ContainerElement,
  TextElement,
  GridElement,
  ElementType,
  Display,
  FlexDirection,
  FlexWrap,
  JustifyContent,
  AlignItems,
  VisibilityMode,
  Background,
  Border
} from './types';

/**
 * Effective defaults — the SINGLE source of truth for what an *unset* property
 * means when rendering (ADR-0001 D4, "unset-first defaults").
 *
 * The element factory no longer stamps cosmetic styling values, so new elements
 * are nearly-empty objects. Whenever the JSON omits a property, both the
 * renderers and (later) the control placeholders resolve its effective value
 * here — never with scattered `|| fallback` at each call site.
 *
 * ┌─────────────┬───────────────────────┬────────────────────────────────────┐
 * │ Concern     │ Property              │ Effective default                  │
 * ├─────────────┼───────────────────────┼────────────────────────────────────┤
 * │ base (all)  │ opacity               │ 1                                  │
 * │ base (all)  │ visibilityMode        │ 'show'                             │
 * │ container   │ display               │ 'flex'                            │
 * │ container   │ flex.direction        │ 'column'                          │
 * │ container   │ flex.wrap             │ 'nowrap'                          │
 * │ container   │ flex.justifyContent   │ 'flex-start'                      │
 * │ container   │ flex.alignItems       │ 'flex-start'                      │
 * │ text        │ fontSize              │ 16 (px)                          │
 * │ text        │ color                 │ '#000000'                        │
 * │ dimensions  │ width  (shape/grid/   │ 100 (px)                         │
 * │             │        image)         │                                    │
 * │ dimensions  │ height (shape/grid/   │ 100 (px)                         │
 * │             │        image)         │                                    │
 * │ grid        │ cellBackground        │ { color: '#cccccc' }             │
 * │ grid        │ cellBorder            │ { width: 2, style: 'solid',      │
 * │             │                       │   color: '#000000' }             │
 * └─────────────┴───────────────────────┴────────────────────────────────────┘
 *
 * Pure module — no Svelte, no side effects.
 */
export const EFFECTIVE_DEFAULTS = {
  /** Shared across every element type. */
  base: {
    opacity: 1,
    visibilityMode: 'show'
  },
  container: {
    display: 'flex',
    /** Only meaningful when the effective display is 'flex'. */
    flex: {
      direction: 'column',
      wrap: 'nowrap',
      justifyContent: 'flex-start',
      alignItems: 'flex-start'
    }
  },
  text: {
    fontSize: 16,
    color: '#000000'
  },
  /** Default footprint for a newly-created shape/grid/image element. */
  dimensions: {
    width: 100,
    height: 100
  },
  grid: {
    cellBackground: { color: '#cccccc' },
    cellBorder: { width: 2, style: 'solid', color: '#000000' }
  }
} as const;

// ---------------------------------------------------------------------------
// Per-concern helpers (ergonomic for renderers)
// ---------------------------------------------------------------------------

/** Effective opacity: explicit value, else 1. */
export function effectiveOpacity(el: { opacity?: number }): number {
  return el.opacity ?? EFFECTIVE_DEFAULTS.base.opacity;
}

/** Effective visibility mode: explicit value, else 'show'. */
export function effectiveVisibilityMode(el: { visibilityMode?: VisibilityMode }): VisibilityMode {
  return el.visibilityMode ?? (EFFECTIVE_DEFAULTS.base.visibilityMode as VisibilityMode);
}

/** Effective container display: explicit value, else 'flex'. */
export function effectiveContainerDisplay(el: Pick<ContainerElement, 'display'>): Display {
  return (el.display ?? EFFECTIVE_DEFAULTS.container.display) as Display;
}

/** Resolved flex config for a container. Direction/wrap/justify/align fall back
 *  to their effective defaults when unset; gap-related values pass through
 *  untouched (they have no effective default — unset means "not applied"). */
export function effectiveContainerFlex(el: Pick<ContainerElement, 'flexConfig'>): {
  direction: FlexDirection;
  wrap: FlexWrap;
  justifyContent: JustifyContent;
  alignItems: AlignItems;
} {
  const fc = el.flexConfig ?? {};
  const d = EFFECTIVE_DEFAULTS.container.flex;
  return {
    direction: (fc.direction ?? d.direction) as FlexDirection,
    wrap: (fc.wrap ?? d.wrap) as FlexWrap,
    justifyContent: (fc.justifyContent ?? d.justifyContent) as JustifyContent,
    alignItems: (fc.alignItems ?? d.alignItems) as AlignItems
  };
}

/** Effective text font size: explicit value (px number or unit string), else 16. */
export function effectiveTextFontSize(el: Pick<TextElement, 'fontSize'>): number | string {
  return el.fontSize ?? EFFECTIVE_DEFAULTS.text.fontSize;
}

/** Effective text color: explicit value, else '#000000'. */
export function effectiveTextColor(el: Pick<TextElement, 'color'>): string {
  return el.color ?? EFFECTIVE_DEFAULTS.text.color;
}

/** Effective grid cell background: explicit value, else { color: '#cccccc' }. */
export function effectiveGridCellBackground(el: Pick<GridElement, 'cellBackground'>): Background {
  return el.cellBackground ?? EFFECTIVE_DEFAULTS.grid.cellBackground;
}

/** Effective grid cell border: explicit value, else 2px solid black. */
export function effectiveGridCellBorder(el: Pick<GridElement, 'cellBorder'>): Border {
  return el.cellBorder ?? EFFECTIVE_DEFAULTS.grid.cellBorder;
}

// ---------------------------------------------------------------------------
// Generic resolver (ergonomic for future control placeholders)
// ---------------------------------------------------------------------------

/**
 * Per-type flat view of effective defaults, keyed by the property name a
 * control would surface. Placeholders ask "what value does an unset property
 * show?" without needing to know which concern it belongs to.
 */
const PER_TYPE_DEFAULTS = {
  container: {
    opacity: EFFECTIVE_DEFAULTS.base.opacity,
    visibilityMode: EFFECTIVE_DEFAULTS.base.visibilityMode,
    display: EFFECTIVE_DEFAULTS.container.display,
    direction: EFFECTIVE_DEFAULTS.container.flex.direction,
    wrap: EFFECTIVE_DEFAULTS.container.flex.wrap,
    justifyContent: EFFECTIVE_DEFAULTS.container.flex.justifyContent,
    alignItems: EFFECTIVE_DEFAULTS.container.flex.alignItems
  },
  text: {
    opacity: EFFECTIVE_DEFAULTS.base.opacity,
    visibilityMode: EFFECTIVE_DEFAULTS.base.visibilityMode,
    fontSize: EFFECTIVE_DEFAULTS.text.fontSize,
    color: EFFECTIVE_DEFAULTS.text.color
  },
  image: {
    opacity: EFFECTIVE_DEFAULTS.base.opacity,
    visibilityMode: EFFECTIVE_DEFAULTS.base.visibilityMode,
    width: EFFECTIVE_DEFAULTS.dimensions.width,
    height: EFFECTIVE_DEFAULTS.dimensions.height
  },
  iterator: {
    opacity: EFFECTIVE_DEFAULTS.base.opacity,
    visibilityMode: EFFECTIVE_DEFAULTS.base.visibilityMode
  },
  shape: {
    opacity: EFFECTIVE_DEFAULTS.base.opacity,
    visibilityMode: EFFECTIVE_DEFAULTS.base.visibilityMode,
    width: EFFECTIVE_DEFAULTS.dimensions.width,
    height: EFFECTIVE_DEFAULTS.dimensions.height
  },
  grid: {
    opacity: EFFECTIVE_DEFAULTS.base.opacity,
    visibilityMode: EFFECTIVE_DEFAULTS.base.visibilityMode,
    width: EFFECTIVE_DEFAULTS.dimensions.width,
    height: EFFECTIVE_DEFAULTS.dimensions.height,
    cellBackground: EFFECTIVE_DEFAULTS.grid.cellBackground,
    cellBorder: EFFECTIVE_DEFAULTS.grid.cellBorder
  }
} as const;

/**
 * Effective default for a given element type + property key, or undefined if
 * that property has no effective default.
 *
 * @example getEffectiveDefault('container', 'direction') // 'column'
 * @example getEffectiveDefault('text', 'fontSize')       // 16
 * @example getEffectiveDefault('shape', 'width')         // 100
 * @example getEffectiveDefault('text', 'width')          // undefined
 */
export function getEffectiveDefault(type: ElementType, key: string): unknown {
  const table = PER_TYPE_DEFAULTS[type] as Record<string, unknown> | undefined;
  return table?.[key];
}
