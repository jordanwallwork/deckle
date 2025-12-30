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
  type: 'Card' | 'Dice';
  createdAt: string;
  updatedAt: string;
}

export interface EditableComponent extends Component {
  dimensions: Dimensions;
}

export interface CardComponent extends EditableComponent {
  type: 'Card';
  size: string;
  frontDesign?: string | null;
  backDesign?: string | null;
  shape: ComponentShape;
  dataSource?: DataSourceInfo | null;
}

export interface DiceComponent extends Component {
  type: 'Dice';
  diceType: string;
  diceStyle: string;
  diceBaseColor: string;
  diceNumber: number;
}

export type GameComponent = CardComponent | DiceComponent;

export interface CreateCardDto {
  name: string;
  size: string;
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
}

export interface UpdateDiceDto {
  name: string;
  type: string;
  style: string;
  baseColor: string;
  number: number;
}
