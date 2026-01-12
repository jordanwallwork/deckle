/**
 * Replaces merge field patterns with values from data source row data.
 *
 * Patterns supported:
 * - {{FieldName}} - Replaces with value from rowData['FieldName']
 * - {{Field Name}} - Supports field names with spaces
 * - {{Field Name|Default Value}} - Uses fallback if field is not found
 *
 * @param content - The text content containing merge field patterns
 * @param rowData - Record mapping field names to values from the selected data source row
 * @returns Content with merge fields replaced by actual values
 *
 * @example
 * replaceMergeFields('Hello {{Name}}', { Name: 'World' }) // 'Hello World'
 * replaceMergeFields('{{Count|0}} items', {}) // '0 items'
 * replaceMergeFields('{{Player Name|Unknown}}', {}) // 'Unknown'
 */
export function replaceMergeFields(
  content: string,
  rowData: Record<string, string> | null | undefined
): string {
  if (!rowData) {
    // If no row data, replace merge fields with fallback values or keep the pattern
    return content.replace(/\{\{([^|{}]+)(?:\|([^}]*))?\}\}/g, (match, _fieldName, fallback) => {
      return fallback !== undefined ? fallback.trim() : match;
    });
  }

  // Pattern explanation:
  // \{\{ - Opening braces (escaped)
  // ([^|{}]+) - Capture group 1: Field name (anything except |, {, })
  // (?:\|([^}]*))? - Optional non-capturing group for fallback:
  //   \| - Pipe character
  //   ([^}]*) - Capture group 2: Fallback value (anything except })
  // \}\} - Closing braces (escaped)
  return content.replace(/\{\{([^|{}]+)(?:\|([^}]*))?\}\}/g, (match, fieldName, fallback) => {
    const normalizedFieldName = fieldName.trim();
    const value = rowData[normalizedFieldName];

    // Return value if found, otherwise use fallback (or original pattern if no fallback)
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }

    return fallback !== undefined ? fallback.trim() : match;
  });
}
