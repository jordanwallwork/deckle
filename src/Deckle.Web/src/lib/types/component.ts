// Component entity types

export interface Dimensions {
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  dpi: number;
  widthPx: number;
  heightPx: number;
  bleedPx: number;
}

export interface ComponentShape {
  type: string;
}

export interface RectangleShape extends ComponentShape {
  type: 'rectangle';
  borderRadiusMm: number;
}

export interface DataSourceInfo {
  id: string;
  name: string;
}

export interface Component {
  id: string;
  projectId: string;
  name: string;
  type: 'Card' | 'Dice' | 'PlayerMat';
  createdAt: string;
  updatedAt: string;
}

export interface EditableComponent extends Component {
  dimensions: Dimensions;
}

export interface CardComponent extends EditableComponent {
  type: 'Card';
  size: string;
  horizontal: boolean;
  frontDesign?: string | null;
  backDesign?: string | null;
  shape: ComponentShape;
  dataSource?: DataSourceInfo | null;
}

export interface DiceComponent extends Component {
  type: 'Dice';
  diceType: string;
  style: string;
  baseColor: string;
  number: number;
}

export interface PlayerMatComponent extends EditableComponent {
  type: 'PlayerMat';
  presetSize?: string | null;
  horizontal: boolean;
  customWidthMm?: number | null;
  customHeightMm?: number | null;
  frontDesign?: string | null;
  backDesign?: string | null;
  shape: ComponentShape;
  dataSource?: DataSourceInfo | null;
}

export type GameComponent = CardComponent | DiceComponent | PlayerMatComponent;

export interface CreateCardDto {
  name: string;
  size: string;
  horizontal?: boolean;
}

export interface CreateDiceDto {
  name: string;
  type: string;
  style: string;
  baseColor: string;
  number: number;
}

export interface UpdateCardDto {
  name: string;
  size: string;
  horizontal?: boolean;
}

export interface UpdateDiceDto {
  name: string;
  type: string;
  style: string;
  baseColor: string;
  number: number;
}

export interface CreatePlayerMatDto {
  name: string;
  presetSize?: string | null;
  horizontal?: boolean;
  customWidthMm?: number | null;
  customHeightMm?: number | null;
}

export interface UpdatePlayerMatDto {
  name: string;
  presetSize?: string | null;
  horizontal?: boolean;
  customWidthMm?: number | null;
  customHeightMm?: number | null;
}
