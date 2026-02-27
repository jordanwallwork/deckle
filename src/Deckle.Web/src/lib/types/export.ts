// Export and print layout types

export type PaperSize = 'A4' | 'A3' | 'USLetter';
export type Orientation = 'portrait' | 'landscape';
export type MeasurementUnit = 'inches' | 'cm';

export interface PaperDimensions {
  widthInches: number;
  heightInches: number;
}

export interface PageSetup {
  paperSize: PaperSize;
  orientation: Orientation;
  marginInches: number;
  unit: MeasurementUnit;
  cropMarks: boolean;
  separateComponentPages: boolean;
}

export const PAPER_DIMENSIONS: Record<PaperSize, PaperDimensions> = {
  A4: { widthInches: 8.27, heightInches: 11.69 },
  A3: { widthInches: 11.69, heightInches: 16.54 },
  USLetter: { widthInches: 8.5, heightInches: 11 }
};

export const DEFAULT_PAGE_SETUP: PageSetup = {
  paperSize: 'A4',
  orientation: 'portrait',
  marginInches: 0.25,
  unit: 'inches',
  cropMarks: true,
  separateComponentPages: false
};
