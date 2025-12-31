import type { DataSource } from "$lib/types";
import { dataSourcesApi } from "$lib/api";

/**
 * Parse CSV text to extract headers and count non-empty rows
 */
export function parseCSVData(csvText: string): {
  headers: string[];
  rowCount: number;
} {
  const lines = csvText.split("\n");

  // Extract headers (first line)
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, "")) // Remove quotes if present
    .filter((h) => h.length > 0);

  // Count non-empty data rows (skip header)
  const dataRows = lines.slice(1).filter((line) => {
    // A row is non-empty if it has at least one non-empty cell
    const cells = line.split(",").map((c) => c.trim());
    return cells.some((cell) => cell.length > 0);
  });

  const rowCount = dataRows.length;

  return { headers, rowCount };
}

/**
 * Sync a data source by fetching CSV data from its export URL,
 * parsing it, and updating the metadata on the server
 */
export async function syncDataSource(
  dataSource: DataSource
): Promise<DataSource> {
  if (!dataSource.csvExportUrl) {
    throw new Error("No CSV export URL available");
  }

  // Fetch the CSV data from the public URL
  const response = await fetch(dataSource.csvExportUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch CSV data");
  }

  const csvText = await response.text();

  // Parse CSV to extract headers and count rows
  const { headers, rowCount } = parseCSVData(csvText);

  // Send metadata to the backend
  const updatedSource = await dataSourcesApi.sync(dataSource.id, {
    headers,
    rowCount,
  });

  return updatedSource;
}
