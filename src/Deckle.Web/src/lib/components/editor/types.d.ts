// ============================================================================
// Base Types and Enums
// ============================================================================

export type ElementType = 'container' | 'text' | 'image';

export type Position = 'absolute' | 'relative';
export type Display = 'flex' | 'block' | 'inline';
export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
export type JustifyContent = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
export type AlignItems = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
export type AlignContent = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around';

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type TextDecoration = 'none' | 'underline' | 'overline' | 'line-through';

export type BackgroundSize = 'cover' | 'contain' | 'auto' | string; // string for custom like "100px 200px"
export type BackgroundRepeat = 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat' | 'space' | 'round';
export type BackgroundPosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | string; // string for custom like "10px 20px"

export type BorderStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'none';

export type ImageFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

// ============================================================================
// Style Sub-interfaces
// ============================================================================

export interface Spacing {
  all?: number | string; // For "all sides" mode - number for px, string for other units (mm, %)
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
}

export interface BorderSide {
  width?: number | string;
  style?: BorderStyle;
  color?: string;
}

export interface Border {
  // For "all sides" mode - when these are set, apply to all sides
  width?: number | string;
  style?: BorderStyle;
  color?: string;

  // For "separate sides" mode - when these are set, they override the above
  top?: BorderSide;
  right?: BorderSide;
  bottom?: BorderSide;
  left?: BorderSide;

  // Border radius (always applies)
  radius?: number | string | {
    topLeft?: number | string;
    topRight?: number | string;
    bottomRight?: number | string;
    bottomLeft?: number | string;
  };
}

export interface Shadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread?: number;
  color: string;
  inset?: boolean;
}

export interface Background {
  color?: string;
  image?: {
    imageId: string;
    size?: BackgroundSize;
    repeat?: BackgroundRepeat;
    position?: BackgroundPosition;
  };
}

export interface FlexConfig {
  direction?: FlexDirection;
  wrap?: FlexWrap;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  alignContent?: AlignContent;
  gap?: number;
  rowGap?: number;
  columnGap?: number;
}

export interface Dimensions {
  width?: number | string; // number for px, string for % or other units
  height?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
}

// ============================================================================
// Base Element Interface
// ============================================================================

export interface BaseElement {
  id: string;
  type: ElementType;
  label?: string; // User-defined label for the element, displayed in structure tree
  position?: Position;
  x?: number | string; // for absolute positioning - number for px, string for other units (mm, %)
  y?: number | string; // for absolute positioning - number for px, string for other units (mm, %)
  zIndex?: number;
  opacity?: number;
  visible?: boolean;
  locked?: boolean; // When true, element cannot be selected or edited in preview, but can be edited in structure tree
  rotation?: number; // rotation in degrees

  // Common styling properties
  padding?: Spacing;
  margin?: Spacing;
  border?: Border;
  dimensions?: Dimensions;
}

// ============================================================================
// Container Element
// ============================================================================

export interface ContainerElement extends BaseElement {
  type: 'container';
  display?: 'flex' | 'block';
  flexConfig?: FlexConfig; // only used when display is 'flex'
  children: TemplateElement[];
  background?: Background;
  shadow?: Shadow | Shadow[]; // support multiple shadows
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  bleedAreaColor?: string; // Color for bleed area marking
  safeAreaColor?: string; // Color for safe area marking
}

// ============================================================================
// Text Element
// ============================================================================

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  markdown?: boolean; // When true, content is parsed as markdown
  display?: 'block' | 'inline';

  // Typography
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number | 'normal' | 'bold' | 'lighter' | 'bolder';
  fontStyle?: 'normal' | 'italic' | 'oblique';
  color?: string;
  textDecoration?: TextDecoration;
  textAlign?: TextAlign;
  lineHeight?: number | string;
  letterSpacing?: number;

  // Background
  backgroundColor?: string;

  // Other
  wordWrap?: 'normal' | 'break-word' | 'break-all';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

// ============================================================================
// Image Element
// ============================================================================

export interface ImageElement extends BaseElement {
  type: 'image';
  imageId: string;

  // Sizing
  objectFit?: ImageFit;
  objectPosition?: string; // e.g., "center", "50% 50%"

  // Optional styling
  shadow?: Shadow | Shadow[];
}

// ============================================================================
// Union Type for All Elements
// ============================================================================

export type TemplateElement = ContainerElement | TextElement | ImageElement;

// ============================================================================
// Root Template Interface
// ============================================================================

export interface Template {
  id: string;
  name: string;
  description?: string;
  width: number;
  height: number;
  root: ContainerElement; // Root is always a container
  metadata?: {
    created: Date;
    modified: Date;
    version: string;
    tags?: string[];
  };
}

// ============================================================================
// Context Menu Interface
// ============================================================================

export interface MenuItem {
  label?: string;
  action?: () => void;
  submenu?: MenuItem[];
  divider?: boolean;
  disabled?: boolean;
}