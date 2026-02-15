import FormulaEvaluator from 'formula-evaluator';

const evaluator = new FormulaEvaluator();

/**
 * Converts string rowData values to appropriate types for formula evaluation.
 * Numeric strings become numbers, "true"/"false" become booleans.
 */
function toTypedContext(rowData: Record<string, string>): Record<string, string | number | boolean> {
  const context: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(rowData)) {
    const lower = value.toLowerCase();
    if (lower === 'true') {
      context[key] = true;
    } else if (lower === 'false') {
      context[key] = false;
    } else if (value !== '' && !isNaN(Number(value))) {
      context[key] = Number(value);
    } else {
      context[key] = value;
    }
  }
  return context;
}

/**
 * Converts a header string into a valid alphanumeric identifier for use with formula-evaluator.
 * Removes spaces and non-alphanumeric characters, producing a PascalCase identifier.
 *
 * @example
 * toIdentifier('Hero Name') // 'HeroName'
 * toIdentifier('Attack Stat') // 'AttackStat'
 * toIdentifier('HP (Max)') // 'HPMax'
 * toIdentifier('already_valid') // 'already_valid'
 */
export function toIdentifier(header: string): string {
  // Split on non-alphanumeric characters, capitalize each word, rejoin
  return header
    .split(/[^a-zA-Z0-9_]+/)
    .filter(Boolean)
    .map((word, index) => {
      // Capitalize the first letter of each word after the first split segment
      // But preserve the original casing of the first segment to handle already-capitalized headers
      if (index === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
}

/**
 * Strips matching surrounding quotes (single or double) from a string.
 */
function stripQuotes(s: string): string {
  if (s.length >= 2 && ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'"))) {
    return s.slice(1, -1);
  }
  return s;
}

/**
 * Replaces merge field patterns with values from data source row data.
 * The expression inside {{ }} is evaluated as a formula using formula-evaluator,
 * with rowData fields available as variables.
 *
 * Patterns supported:
 * - {{FieldName}} - Evaluates as a variable reference, resolves from rowData
 * - {{IF(Type = 'Fire', "Burnt", "Wet")}} - Formula expressions
 * - {{Price + Tax}} - Arithmetic expressions
 * - {{Expression|Default Value}} - Uses fallback if evaluation fails or returns empty
 *
 * @param content - The text content containing merge field patterns
 * @param rowData - Record mapping field names to values from the selected data source row
 * @returns Content with merge fields replaced by evaluated values
 *
 * @example
 * replaceMergeFields('Hello {{Name}}', { Name: 'World' }) // 'Hello World'
 * replaceMergeFields('{{Count|0}} items', {}) // '0 items'
 * replaceMergeFields('{{Price + Tax}}', { Price: '10', Tax: '2' }) // '12'
 * replaceMergeFields('{{3 / Zero|N/A}}', { Zero: '0' }) // 'N/A'
 */
/**
 * Evaluates a visibility condition formula against row data.
 * Returns true if the element should be visible, false if it should be hidden.
 * Empty strings, null, undefined, false, and 0 are considered falsy (hidden).
 *
 * @param condition - The formula expression to evaluate (without {{ }} delimiters)
 * @param rowData - Record mapping field names to values from the selected data source row
 * @returns true if the element should be visible
 */
export function evaluateVisibility(
  condition: string | undefined,
  rowData: Record<string, string> | null | undefined
): boolean {
  if (!condition || !condition.trim()) {
    return false;
  }

  if (!rowData) {
    return false;
  }

  const context = toTypedContext(rowData);
  const expression = condition.trim();

  try {
    const result = evaluator.evaluate(expression, context);
    return !!result;
  } catch {
    return false;
  }
}

export function replaceMergeFields(
  content: string,
  rowData: Record<string, string> | null | undefined
): string {
  if (!rowData) {
    return content.replace(/\{\{([^|{}]+)(?:\|([^}]*))?\}\}/g, (match, _formula, fallback) => {
      return fallback !== undefined ? stripQuotes(fallback.trim()) : match;
    });
  }

  const context = toTypedContext(rowData);

  return content.replace(/\{\{([^|{}]+)(?:\|([^}]*))?\}\}/g, (match, formula, fallback) => {
    const expression = formula.trim();
    try {
      const result = evaluator.evaluate(expression, context);
      if (result !== undefined && result !== null && result !== '') {
        return String(result);
      }
    } catch {
      // Evaluation failed — fall through to fallback
    }

    return fallback !== undefined ? stripQuotes(fallback.trim()) : match;
  });
}
