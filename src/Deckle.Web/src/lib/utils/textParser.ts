/**
 * Parses text content and converts inline class syntax and icon syntax to HTML.
 *
 * Inline class syntax: {className: text content}
 * Output: <span class="className">text content</span>
 *
 * Icon syntax: {[icon-name]}
 * Output: <i class="fa-regular fa-icon-name"></i>
 *
 * Solid icon syntax: {[s:icon-name]}
 * Output: <i class="fa-solid fa-icon-name"></i>
 *
 * Icon with class syntax: {className:[icon-name]} or {className:[s:icon-name]}
 * Output: <span class="className"><i class="fa-regular fa-icon-name"></i></span>
 *
 * Example:
 *   Input: "Hello {highlight: world}! {[address-card]} {bigRed:[s:crown]}"
 *   Output: 'Hello <span class="highlight">world</span>! <i class="fa-regular fa-address-card"></i> <span class="bigRed"><i class="fa-solid fa-crown"></i></span>'
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
 * Sanitizes an icon name to only allow valid FontAwesome icon name characters.
 * Allows: lowercase letters, numbers, hyphens
 */
function sanitizeIconName(iconName: string): string {
  return iconName.replace(/[^a-z0-9-]/g, '');
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
 * Generates the HTML for a FontAwesome icon.
 * Supports a style prefix: "s:icon-name" for solid, plain "icon-name" for regular.
 */
function iconHtml(rawIconName: string): string {
  let style = 'fa-regular';
  let name = rawIconName;
  if (name.startsWith('s:')) {
    style = 'fa-solid';
    name = name.slice(2);
  }
  const sanitized = sanitizeIconName(name);
  if (!sanitized) return '';
  return `<i class="${style} fa-${sanitized}"></i>`;
}

/**
 * Parses text content and converts inline class syntax and icon syntax to HTML.
 *
 * @param content - The text content to parse
 * @param escapeText - Whether to escape HTML in the text portions (default: true)
 * @returns The parsed HTML string
 */
export function parseInlineClasses(content: string, escapeText: boolean = true): string {
  // Combined pattern matches:
  // 1. {className:[icon-name]} - icon with class wrapper
  // 2. {[icon-name]} - standalone icon
  // 3. {className: text content} - inline class (original)
  const pattern = /\{([^{}:]*?):\s*\[((?:s:)?[a-z0-9-]+)\]\}|\{\[((?:s:)?[a-z0-9-]+)\]\}|\{([^{}:]+):\s*([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;

  let lastIndex = 0;
  let output = '';
  let match;

  pattern.lastIndex = 0;

  while ((match = pattern.exec(content)) !== null) {
    // Add the text before this match
    const beforeMatch = content.substring(lastIndex, match.index);
    output += escapeText ? escapeHtml(beforeMatch) : beforeMatch;

    if (match[3] !== undefined) {
      // Standalone icon: {[icon-name]}
      const icon = iconHtml(match[3]);
      output += icon || (escapeText ? escapeHtml(match[0]) : match[0]);
    } else if (match[1] !== undefined && match[2] !== undefined) {
      // Icon with class: {className:[icon-name]}
      const className = match[1].trim();
      const sanitizedClass = sanitizeClassName(className);
      const icon = iconHtml(match[2]);

      if (icon && sanitizedClass) {
        output += `<span class="${sanitizedClass}">${icon}</span>`;
      } else if (icon) {
        output += icon;
      } else {
        output += escapeText ? escapeHtml(match[0]) : match[0];
      }
    } else if (match[4] !== undefined && match[5] !== undefined) {
      // Original inline class: {className: text content}
      const className = match[4].trim();
      const textContent = match[5].trim();
      const sanitizedClass = sanitizeClassName(className);

      if (sanitizedClass) {
        const escapedContent = escapeText ? escapeHtml(textContent) : textContent;
        output += `<span class="${sanitizedClass}">${escapedContent}</span>`;
      } else {
        output += escapeText ? escapeHtml(match[0]) : match[0];
      }
    }

    lastIndex = pattern.lastIndex;
  }

  // Add any remaining text after the last match
  const remaining = content.substring(lastIndex);
  output += escapeText ? escapeHtml(remaining) : remaining;

  return output;
}

/**
 * Checks if the content contains any inline class syntax or icon syntax.
 */
export function hasInlineClasses(content: string): boolean {
  const pattern = /\{[^{}:]*:\s*\[(?:s:)?[a-z0-9-]+\]\}|\{\[(?:s:)?[a-z0-9-]+\]\}|\{[^{}:]+:\s*[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/;
  return pattern.test(content);
}
