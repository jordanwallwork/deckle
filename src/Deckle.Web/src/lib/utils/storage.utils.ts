const BYTES_PER_MB = 1024 * 1024;

/**
 * Formats storage usage against a quota, e.g. "512.0 KB / 50 MB" or "12.3 MB / 50 MB"
 */
export function formatStorage(bytes: number, quotaMb: number): string {
  const usedMb = bytes / BYTES_PER_MB;
  if (usedMb < 1) {
    return `${(bytes / 1024).toFixed(1)} KB / ${quotaMb} MB`;
  }
  return `${usedMb.toFixed(1)} MB / ${quotaMb} MB`;
}

/**
 * Percentage of the quota used, clamped to 0–100 (0 when the quota is zero)
 */
export function getStoragePercentage(bytes: number, quotaMb: number): number {
  const quotaBytes = quotaMb * BYTES_PER_MB;
  if (quotaBytes <= 0) return 0;
  return Math.min(100, Math.max(0, (bytes / quotaBytes) * 100));
}
