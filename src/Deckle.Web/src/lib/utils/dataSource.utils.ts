import type { DataSource } from '$lib/types';
import { dataSourcesApi } from '$lib/api';

/**
 * Parse a single CSV line handling quoted fields (RFC 4180).
 * Quoted fields may contain commas and escaped quotes ("").
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const c = line[i];

    if (inQuotes) {
      if (c === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        field += c;
        i++;
      }
    } else {
      if (c === '"' && field.length === 0) {
        // Start of quoted field
        inQuotes = true;
        i++;
      } else if (c === ',') {
        fields.push(field.trim());
        field = '';
        i++;
      } else {
        field += c;
        i++;
      }
    }
  }

  fields.push(field.trim());
  return fields;
}

/**
 * Parse CSV text to extract headers and count non-empty rows
 */
export function parseCSVData(csvText: string): {
  headers: string[];
  rowCount: number;
} {
  const lines = csvText.split('\n');

  // Extract headers (first line)
  const headers = parseCSVLine(lines[0])
    .map((h) => h.replace(/^"|"$/g, ''))
    .filter((h) => h.length > 0);

  // Count non-empty data rows (skip header)
  const dataRows = lines.slice(1).filter((line) => {
    const cells = parseCSVLine(line);
    return cells.some((cell) => cell.length > 0);
  });

  const rowCount = dataRows.length;

  return { headers, rowCount };
}

/**
 * Sync a data source by fetching CSV data from its export URL,
 * parsing it, and updating the metadata on the server
 */
export async function syncDataSource(dataSource: DataSource): Promise<DataSource> {
  if (!dataSource.csvExportUrl) {
    throw new Error('No CSV export URL available');
  }

  // Fetch the CSV data from the public URL
  const response = await fetch(dataSource.csvExportUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch CSV data');
  }

  const csvText = await response.text();

  // Parse CSV to extract headers and count rows
  const { headers, rowCount } = parseCSVData(csvText);

  // Send metadata to the backend
  const updatedSource = await dataSourcesApi.sync(dataSource.id, {
    headers,
    rowCount
  });

  return updatedSource;
}
