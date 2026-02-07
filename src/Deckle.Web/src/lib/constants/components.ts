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

// Player mat size options
export const PLAYER_MAT_SIZES: readonly PlayerMatSize[] = [
  { value: 'SmallRectangle', label: 'Small Rectangle', widthMm: 101.6, heightMm: 152.4 },
  { value: 'SmallSquare', label: 'Small Square', widthMm: 152.4, heightMm: 152.4 },
  { value: 'MediumRectangle', label: 'Medium Rectangle', widthMm: 152.4, heightMm: 228.6 },
  { value: 'MediumSquare', label: 'Medium Square', widthMm: 228.6, heightMm: 228.6 },
  { value: 'A4', label: 'A4', widthMm: 210, heightMm: 297 },
  { value: 'USLetter', label: 'US Letter', widthMm: 215.9, heightMm: 279.4 }
] as const;

