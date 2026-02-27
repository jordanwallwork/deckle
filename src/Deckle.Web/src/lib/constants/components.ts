// Type definitions for component configuration options

export interface CardSize {
  value: string;
  label: string;
  widthMm: number;
  heightMm: number;
}

export interface DiceType {
  value: string;
  label: string;
}

export interface DiceStyle {
  value: string;
  label: string;
}

export interface DiceColor {
  value: string;
  label: string;
  hex: string;
  colorblindFriendly: boolean;
}

export interface PlayerMatSize {
  value: string;
  label: string;
  widthMm: number;
  heightMm: number;
}

export interface GameBoardPresetSize {
  value: string;
  label: string;
  group: 'Square' | 'Rectangle';
  /** Unfolded width in landscape orientation (mm) */
  landscapeWidthMm: number;
  /** Unfolded height in landscape orientation (mm) */
  landscapeHeightMm: number;
  isQuadFold: boolean;
}

// Card size options
export const CARD_SIZES: readonly CardSize[] = [
  { value: 'MiniAmerican', label: 'Mini American', widthMm: 41, heightMm: 63 },
  { value: 'MiniEuro', label: 'Mini Euro', widthMm: 44, heightMm: 67 },
  { value: 'Bridge', label: 'Bridge', widthMm: 57.2, heightMm: 88.9 },
  { value: 'MetricPoker', label: 'Metric Poker', widthMm: 63, heightMm: 88 },
  { value: 'StandardPoker', label: 'Standard Poker', widthMm: 63.5, heightMm: 88.9 },
  { value: 'Tarot', label: 'Tarot', widthMm: 70, heightMm: 120 },
  { value: 'Jumbo', label: 'Jumbo', widthMm: 88, heightMm: 126 },
  { value: 'ExtraSmallSquare', label: 'Extra Small Square', widthMm: 55, heightMm: 55 },
  { value: 'SmallSquare', label: 'Small Square', widthMm: 63.5, heightMm: 63.5 },
  { value: 'MediumSquare', label: 'Medium Square', widthMm: 70, heightMm: 70 },
  { value: 'LargeSquare', label: 'Large Square', widthMm: 88.9, heightMm: 88.9 }
] as const;

// Dice type options
export const DICE_TYPES: readonly DiceType[] = [
  { value: 'D4', label: 'D4' },
  { value: 'D6', label: 'D6' },
  { value: 'D8', label: 'D8' },
  { value: 'D10', label: 'D10' },
  { value: 'D12', label: 'D12' },
  { value: 'D20', label: 'D20' }
] as const;

// Dice style options
export const DICE_STYLES: readonly DiceStyle[] = [
  { value: 'Numbered', label: 'Numbered' },
  { value: 'Pips', label: 'Pips' },
  { value: 'Blank', label: 'Blank' }
] as const;

// Dice color options
export const DICE_COLORS: readonly DiceColor[] = [
  { value: 'EarthGreen', label: 'Earth Green', hex: '#3cb8b5', colorblindFriendly: true },
  { value: 'MarsRed', label: 'Mars Red', hex: '#e00022', colorblindFriendly: true },
  { value: 'MercuryGrey', label: 'Mercury Grey', hex: '#e5e1e6', colorblindFriendly: true },
  { value: 'NeptuneBlue', label: 'Neptune Blue', hex: '#1d50b8', colorblindFriendly: true },
  { value: 'SpaceBlack', label: 'Space Black', hex: '#111820', colorblindFriendly: true },
  { value: 'SunYellow', label: 'Sun Yellow', hex: '#f4e834', colorblindFriendly: true },
  { value: 'EmeraldGreen', label: 'Emerald Green', hex: '#34ab49', colorblindFriendly: false },
  { value: 'JupiterOrange', label: 'Jupiter Orange', hex: '#ed8100', colorblindFriendly: false },
  { value: 'NebularPurple', label: 'Nebular Purple', hex: '#872a92', colorblindFriendly: false },
  { value: 'PlutoBrown', label: 'Pluto Brown', hex: '#8e4400', colorblindFriendly: false },
  { value: 'StarWhite', label: 'Star White', hex: '#ffffff', colorblindFriendly: false }
] as const;

// Game board preset size options
export const GAME_BOARD_SIZES: readonly GameBoardPresetSize[] = [
  // Square bi-folds
  { value: 'SmallBifoldSquare',        label: 'Small Bi-fold Square',        group: 'Square',    landscapeWidthMm: 304.8, landscapeHeightMm: 152.4, isQuadFold: false },
  { value: 'MediumBifoldSquare',       label: 'Medium Bi-fold Square',       group: 'Square',    landscapeWidthMm: 457.2, landscapeHeightMm: 228.6, isQuadFold: false },
  { value: 'LargeBifoldSquare',        label: 'Large Bi-fold Square',        group: 'Square',    landscapeWidthMm: 533.4, landscapeHeightMm: 266.7, isQuadFold: false },
  { value: 'ExtraLargeBifoldSquare',   label: 'Extra Large Bi-fold Square',  group: 'Square',    landscapeWidthMm: 609.6, landscapeHeightMm: 304.8, isQuadFold: false },
  // Square quad-folds
  { value: 'SmallQuadFoldSquare',      label: 'Small Quad-fold Square',      group: 'Square',    landscapeWidthMm: 304.8, landscapeHeightMm: 304.8, isQuadFold: true  },
  { value: 'MediumQuadFoldSquare',     label: 'Medium Quad-fold Square',     group: 'Square',    landscapeWidthMm: 457.2, landscapeHeightMm: 457.2, isQuadFold: true  },
  { value: 'LargeQuadFoldSquare',      label: 'Large Quad-fold Square',      group: 'Square',    landscapeWidthMm: 533.4, landscapeHeightMm: 533.4, isQuadFold: true  },
  { value: 'ExtraLargeQuadFoldSquare', label: 'Extra Large Quad-fold Square',group: 'Square',    landscapeWidthMm: 609.6, landscapeHeightMm: 609.6, isQuadFold: true  },
  // Rectangle bi-folds
  { value: 'SmallBifoldRectangle',     label: 'Small Bi-fold Rectangle',     group: 'Rectangle', landscapeWidthMm: 203.2, landscapeHeightMm: 152.4, isQuadFold: false },
  { value: 'MediumBifoldRectangle',    label: 'Medium Bi-fold Rectangle',    group: 'Rectangle', landscapeWidthMm: 304.8, landscapeHeightMm: 228.6, isQuadFold: false },
  { value: 'LargeBifoldRectangle',     label: 'Large Bi-fold Rectangle',     group: 'Rectangle', landscapeWidthMm: 381.0, landscapeHeightMm: 266.7, isQuadFold: false },
  // Rectangle quad-folds
  { value: 'SmallQuadFoldRectangle',   label: 'Small Quad-fold Rectangle',   group: 'Rectangle', landscapeWidthMm: 304.8, landscapeHeightMm: 203.2, isQuadFold: true  },
  { value: 'MediumQuadFoldRectangle',  label: 'Medium Quad-fold Rectangle',  group: 'Rectangle', landscapeWidthMm: 457.2, landscapeHeightMm: 304.8, isQuadFold: true  },
  { value: 'LargeQuadFoldRectangle',   label: 'Large Quad-fold Rectangle',   group: 'Rectangle', landscapeWidthMm: 533.4, landscapeHeightMm: 381.0, isQuadFold: true  },
] as const;

// Player mat size options
export const PLAYER_MAT_SIZES: readonly PlayerMatSize[] = [
  { value: 'SmallRectangle', label: 'Small Rectangle', widthMm: 101.6, heightMm: 152.4 },
  { value: 'SmallSquare', label: 'Small Square', widthMm: 152.4, heightMm: 152.4 },
  { value: 'MediumRectangle', label: 'Medium Rectangle', widthMm: 152.4, heightMm: 228.6 },
  { value: 'MediumSquare', label: 'Medium Square', widthMm: 228.6, heightMm: 228.6 },
  { value: 'A4', label: 'A4', widthMm: 210, heightMm: 297 },
  { value: 'USLetter', label: 'US Letter', widthMm: 215.9, heightMm: 279.4 }
] as const;

