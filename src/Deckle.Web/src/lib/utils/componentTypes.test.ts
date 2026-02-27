import { describe, it, expect } from 'vitest';
import type { CardComponent, DiceComponent, GameBoardComponent, PlayerMatComponent } from '$lib/types';
import {
  isEditableComponent,
  hasDataSource,
  isCard,
  isDice,
  isGameBoard,
  isPlayerMat,
  getComponentDisplayType,
  isExportable
} from './componentTypes';

const mockCard: CardComponent = {
  id: '1',
  projectId: 'p1',
  name: 'Test Card',
  type: 'Card',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  size: 'StandardPoker',
  horizontal: false,
  dimensions: {
    widthMm: 63.5,
    heightMm: 88.9,
    bleedMm: 3,
    dpi: 300,
    widthPx: 749,
    heightPx: 1050,
    bleedPx: 35
  },
  shape: { type: 'rectangle' }
};

const mockDice: DiceComponent = {
  id: '2',
  projectId: 'p1',
  name: 'Test Dice',
  type: 'Dice',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  diceType: 'D6',
  style: 'Numbered',
  baseColor: 'EarthGreen',
  number: 1
};

const mockGameBoard: GameBoardComponent = {
  id: '4',
  projectId: 'p1',
  name: 'Test Game Board',
  type: 'GameBoard',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  horizontal: true,
  presetSize: 'MediumBifoldRectangle',
  horizontalFolds: 0,
  verticalFolds: 1,
  dimensions: {
    widthMm: 304.8,
    heightMm: 228.6,
    bleedMm: 3,
    dpi: 300,
    widthPx: 3601,
    heightPx: 2701,
    bleedPx: 35
  },
  foldedDimensions: {
    widthMm: 152.4,
    heightMm: 228.6,
    thicknessMm: 5
  },
  shape: { type: 'rectangle' }
};

const mockPlayerMat: PlayerMatComponent = {
  id: '3',
  projectId: 'p1',
  name: 'Test Player Mat',
  type: 'PlayerMat',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  horizontal: false,
  dimensions: {
    widthMm: 210,
    heightMm: 297,
    bleedMm: 3,
    dpi: 300,
    widthPx: 2480,
    heightPx: 3508,
    bleedPx: 35
  },
  shape: { type: 'rectangle' }
};

describe('isEditableComponent', () => {
  it('returns true for Card', () => {
    expect(isEditableComponent(mockCard)).toBe(true);
  });

  it('returns true for GameBoard', () => {
    expect(isEditableComponent(mockGameBoard)).toBe(true);
  });

  it('returns true for PlayerMat', () => {
    expect(isEditableComponent(mockPlayerMat)).toBe(true);
  });

  it('returns false for Dice', () => {
    expect(isEditableComponent(mockDice)).toBe(false);
  });
});

describe('hasDataSource', () => {
  it('returns true for Card', () => {
    expect(hasDataSource(mockCard)).toBe(true);
  });

  it('returns true for GameBoard', () => {
    expect(hasDataSource(mockGameBoard)).toBe(true);
  });

  it('returns true for PlayerMat', () => {
    expect(hasDataSource(mockPlayerMat)).toBe(true);
  });

  it('returns false for Dice', () => {
    expect(hasDataSource(mockDice)).toBe(false);
  });
});

describe('isCard', () => {
  it('returns true for Card', () => expect(isCard(mockCard)).toBe(true));
  it('returns false for Dice', () => expect(isCard(mockDice)).toBe(false));
  it('returns false for PlayerMat', () => expect(isCard(mockPlayerMat)).toBe(false));
});

describe('isDice', () => {
  it('returns true for Dice', () => expect(isDice(mockDice)).toBe(true));
  it('returns false for Card', () => expect(isDice(mockCard)).toBe(false));
  it('returns false for PlayerMat', () => expect(isDice(mockPlayerMat)).toBe(false));
});

describe('isPlayerMat', () => {
  it('returns true for PlayerMat', () => expect(isPlayerMat(mockPlayerMat)).toBe(true));
  it('returns false for Card', () => expect(isPlayerMat(mockCard)).toBe(false));
  it('returns false for Dice', () => expect(isPlayerMat(mockDice)).toBe(false));
});

describe('isGameBoard', () => {
  it('returns true for GameBoard', () => expect(isGameBoard(mockGameBoard)).toBe(true));
  it('returns false for Card', () => expect(isGameBoard(mockCard)).toBe(false));
  it('returns false for Dice', () => expect(isGameBoard(mockDice)).toBe(false));
  it('returns false for PlayerMat', () => expect(isGameBoard(mockPlayerMat)).toBe(false));
});

describe('getComponentDisplayType', () => {
  it('returns "Card" for a Card component', () => {
    expect(getComponentDisplayType(mockCard)).toBe('Card');
  });

  it('returns "Dice" for a Dice component', () => {
    expect(getComponentDisplayType(mockDice)).toBe('Dice');
  });

  it('returns "Game Board" for a GameBoard component', () => {
    expect(getComponentDisplayType(mockGameBoard)).toBe('Game Board');
  });

  it('returns "Player Mat" for a PlayerMat component', () => {
    expect(getComponentDisplayType(mockPlayerMat)).toBe('Player Mat');
  });
});

describe('isExportable', () => {
  it('returns true for Card', () => expect(isExportable(mockCard)).toBe(true));
  it('returns true for GameBoard', () => expect(isExportable(mockGameBoard)).toBe(true));
  it('returns true for PlayerMat', () => expect(isExportable(mockPlayerMat)).toBe(true));
  it('returns false for Dice', () => expect(isExportable(mockDice)).toBe(false));
});
