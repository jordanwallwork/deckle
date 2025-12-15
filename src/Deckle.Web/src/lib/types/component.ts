// Component entity types

export interface Dimensions {
  widthMm: number;
  heightMm: number;
  dpi: number;
  widthPx: number;
  heightPx: number;
}

export interface Component {
  id: string;
  projectId: string;
  name: string;
  type: 'Card' | 'Dice';
  createdAt: string;
  updatedAt: string;
}

export interface ComponentWithDimensions extends Component {
  dimensions: Dimensions;
}

export interface CardComponent extends ComponentWithDimensions {
  type: 'Card';
  cardSize: string;
  frontDesign?: string | null;
  backDesign?: string | null;
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
