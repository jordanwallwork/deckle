const MM_PER_INCH = 25.4;

export function mmToPx(mm: number, dpi: number) {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

/**
 * Converts a pixel value to millimetres at the given DPI.
 * Rounded to 2 decimal places to avoid floating-point noise.
 */
export function pxToMm(px: number, dpi: number) {
  return Math.round((px / dpi) * MM_PER_INCH * 100) / 100;
}

const PT_TO_MM_MULTIPLIER = 0.3527780444000399;

export function ptToPx(pt: number, dpi: number) {
  return mmToPx(pt * PT_TO_MM_MULTIPLIER, dpi);
}
