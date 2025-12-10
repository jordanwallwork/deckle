// Type definitions for component configuration options

export interface CardSize {
  value: string;
  label: string;
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

// Card size options
export const CARD_SIZES: readonly CardSize[] = [
  { value: 'MiniAmerican', label: 'Mini American (41mm × 63mm)' },
  { value: 'MiniEuro', label: 'Mini Euro (44mm × 67mm)' },
  { value: 'Bridge', label: 'Bridge (57.2mm × 88.9mm)' },
  { value: 'MetricPoker', label: 'Metric Poker (63mm × 88mm)' },
  { value: 'StandardPoker', label: 'Standard Poker (63.5mm × 88.9mm)' },
  { value: 'Tarot', label: 'Tarot (70mm × 120mm)' },
  { value: 'Jumbo', label: 'Jumbo (88mm × 126mm)' },
  { value: 'ExtraSmallSquare', label: 'Extra Small Square (55mm × 55mm)' },
  { value: 'SmallSquare', label: 'Small Square (63.5mm × 63.5mm)' },
  { value: 'MediumSquare', label: 'Medium Square (70mm × 70mm)' },
  { value: 'LargeSquare', label: 'Large Square (88.9mm × 88.9mm)' }
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
