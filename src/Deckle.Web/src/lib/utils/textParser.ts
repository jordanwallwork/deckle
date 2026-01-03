/**
 * Parses text content and converts inline class syntax to HTML spans.
 * Syntax: {className: text content}
 * Output: <span class="className">text content</span>
 *
 * Example:
 *   Input: "Hello {highlight: world}!"
 *   Output: "Hello <span class=\"highlight\">world</span>!"
 */

/**
 * Sanitizes a class name to only allow valid CSS class name characters.
 * Allows: letters, numbers, hyphens, underscores
 */
function sanitizeClassName(className: string): string {
  // Remove any characters that aren't valid in CSS class names
  return className.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Escapes HTML special characters to prevent XSS attacks.
 */
function escapeHtml(text: string): string {
  // Manual escaping for SSR compatibility (document is not available server-side)
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parses text content and converts inline class syntax to HTML.
 *
 * @param content - The text content to parse
 * @param escapeText - Whether to escape HTML in the text portions (default: true)
 * @returns The parsed HTML string
 */
export function parseInlineClasses(content: string, escapeText: boolean = true): string {
  // Pattern: {className: text content}
  // Supports nested braces in text content, but class name cannot contain colons or braces
  const pattern = /\{([^{}:]+):\s*([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;

  let result = content;
  let lastIndex = 0;
  let output = '';
  let match;

  // Reset the pattern's lastIndex
  pattern.lastIndex = 0;

  while ((match = pattern.exec(content)) !== null) {
    const fullMatch = match[0];
    const className = match[1].trim();
    const textContent = match[2].trim();

    // Add the text before this match
    const beforeMatch = content.substring(lastIndex, match.index);
    output += escapeText ? escapeHtml(beforeMatch) : beforeMatch;

    // Sanitize the class name
    const sanitizedClass = sanitizeClassName(className);

    if (sanitizedClass) {
      // Add the span with class
      const escapedContent = escapeText ? escapeHtml(textContent) : textContent;
      output += `<span class="${sanitizedClass}">${escapedContent}</span>`;
    } else {
      // If class name is invalid after sanitization, just output the original text
      output += escapeText ? escapeHtml(fullMatch) : fullMatch;
    }

    lastIndex = pattern.lastIndex;
  }

  // Add any remaining text after the last match
  const remaining = content.substring(lastIndex);
  output += escapeText ? escapeHtml(remaining) : remaining;

  return output;
}

/**
 * Checks if the content contains any inline class syntax.
 */
export function hasInlineClasses(content: string): boolean {
  const pattern = /\{[^{}:]+:\s*[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/;
  return pattern.test(content);
}
