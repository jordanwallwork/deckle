// Component entity types

export interface Component {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardComponent extends Component {
  size: string;
  type?: never;
  style?: never;
  baseColor?: never;
  frontDesign?: string;
  backDesign?: string;
}

export interface DiceComponent extends Component {
  type: string;
  style: string;
  baseColor: string;
  size?: never;
  frontDesign?: never;
  backDesign?: never;
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
}
