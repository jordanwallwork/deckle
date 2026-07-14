import type { DataSource } from '$lib/types';
import { dataSourcesApi } from '$lib/api';

/**
 * Parse a single CSV line handling quoted fields (RFC 4180).
 * Quoted fields may contain commas and escaped quotes ("").
 */
interface CsvCharResult {
  nextIndex: number;
  field: string;
  inQuotes: boolean;
}

function consumeQuotedChar(line: string, i: number, field: string): CsvCharResult {
  const c = line[i];
  if (c !== '"') {
    return { nextIndex: i + 1, field: field + c, inQuotes: true };
  }
  // Escaped quote ""
  if (i + 1 < line.length && line[i + 1] === '"') {
    return { nextIndex: i + 2, field: field + '"', inQuotes: true };
  }
  // End of quoted field
  return { nextIndex: i + 1, field, inQuotes: false };
}

function consumeUnquotedChar(line: string, i: number, field: string, fields: string[]): CsvCharResult {
  const c = line[i];
  if (c === '"' && field.length === 0) {
    // Start of quoted field
    return { nextIndex: i + 1, field, inQuotes: true };
  }
  if (c === ',') {
    fields.push(field.trim());
    return { nextIndex: i + 1, field: '', inQuotes: false };
  }
  return { nextIndex: i + 1, field: field + c, inQuotes: false };
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const result: CsvCharResult = inQuotes
      ? consumeQuotedChar(line, i, field)
      : consumeUnquotedChar(line, i, field, fields);
    i = result.nextIndex;
    field = result.field;
    inQuotes = result.inQuotes;
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
