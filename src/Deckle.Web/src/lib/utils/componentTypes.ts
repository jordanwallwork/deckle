import type {
  GameComponent,
  CardComponent,
  DiceComponent,
  GameBoardComponent,
  PlayerMatComponent,
  EditableComponent
} from '$lib/types';

// Type guard for components that can be edited (have front/back designs)
export function isEditableComponent(c: GameComponent): c is CardComponent | GameBoardComponent | PlayerMatComponent {
  return c.type === 'Card' || c.type === 'GameBoard' || c.type === 'PlayerMat';
}

// Type guard for components that can have a data source
export function hasDataSource(c: GameComponent): c is CardComponent | GameBoardComponent | PlayerMatComponent {
  return c.type === 'Card' || c.type === 'GameBoard' || c.type === 'PlayerMat';
}

// Specific component type guards
export function isCard(c: GameComponent): c is CardComponent {
  return c.type === 'Card';
}

export function isDice(c: GameComponent): c is DiceComponent {
  return c.type === 'Dice';
}

export function isGameBoard(c: GameComponent): c is GameBoardComponent {
  return c.type === 'GameBoard';
}

export function isPlayerMat(c: GameComponent): c is PlayerMatComponent {
  return c.type === 'PlayerMat';
}

// Helper functions
export function getComponentDisplayType(c: GameComponent): string {
  switch (c.type) {
    case 'Card':
      return 'Card';
    case 'Dice':
      return 'Dice';
    case 'GameBoard':
      return 'Game Board';
    case 'PlayerMat':
      return 'Player Mat';
    default:
      // Exhaustive check - this should never happen
      const _exhaustiveCheck: never = c;
      return String(_exhaustiveCheck);
  }
}

export function isExportable(c: GameComponent): boolean {
  return isEditableComponent(c);
}
