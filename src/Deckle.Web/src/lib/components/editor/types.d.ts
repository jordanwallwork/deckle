// ============================================================================
// Base Types and Enums
// ============================================================================

export type ElementType = 'container' | 'text' | 'image' | 'iterator' | 'shape';

export type ShapeType = 'circle' | 'hexagon' | 'triangle' | 'heart';

export type Position = 'absolute' | 'relative';
export type Display = 'flex' | 'block' | 'inline';
export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
export type JustifyContent =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';
export type AlignItems = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
export type AlignContent =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'stretch'
  | 'space-between'
  | 'space-around';

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type TextDecoration = 'none' | 'underline' | 'overline' | 'line-through';

export type BackgroundSize = 'cover' | 'contain' | 'auto' | string; // string for custom like "100px 200px"
export type BackgroundRepeat = 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat' | 'space' | 'round';
export type BackgroundPosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | string; // string for custom like "10px 20px"

export type BorderStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'none';

export type ImageFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

export type VisibilityMode = 'show' | 'hide' | 'conditional';

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
  radius?:
    | number
    | string
    | {
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

export interface FontMetadata {
  family: string; // e.g., "Roboto"
  variants?: string[]; // e.g., ["400", "700", "400italic"]
  category?: string; // e.g., "sans-serif", "serif", "display", "handwriting", "monospace"
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
  visibilityMode?: VisibilityMode; // 'show' (default), 'hide', or 'conditional'
  visibilityCondition?: string; // Formula for conditional visibility (used when visibilityMode is 'conditional')
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
  fonts?: FontMetadata[]; // Track fonts used in this design
  innerBorderRadius?:
    | number
    | string
    | {
        topLeft?: number | string;
        topRight?: number | string;
        bottomRight?: number | string;
        bottomLeft?: number | string;
      };
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
// Iterator Element
// ============================================================================

export interface IteratorElement extends BaseElement {
  type: 'iterator';
  iteratorName: string; // Variable name exposed to children (e.g., 'i')
  fromExpression: string; // Formula expression for range start (inclusive)
  toExpression: string; // Formula expression for range end (inclusive)
  children: TemplateElement[];
}

// ============================================================================
// Shape Element
// ============================================================================

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: ShapeType;
  children: TemplateElement[];
  background?: Background;
  shadow?: Shadow | Shadow[];
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
}

// ============================================================================
// Union Type for All Elements
// ============================================================================

export type TemplateElement = ContainerElement | TextElement | ImageElement | IteratorElement | ShapeElement;

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

