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
 * Tries to parse the inner content of a brace pair into an HTML token.
 * Returns the HTML string if matched, or null if the content doesn't match any pattern.
 */
function tryParseToken(inner: string, escapeText: boolean): string | null {
  // 1. Standalone icon: [iconName] or [s:iconName]
  if (inner.startsWith('[') && inner.endsWith(']')) {
    const iconName = inner.slice(1, -1);
    const icon = iconHtml(iconName);
    return icon || null;
  }

  // 2. Icon with class: className:[iconName]
  const bracketIdx = inner.indexOf(':[');
  if (bracketIdx > 0 && inner.endsWith(']')) {
    const className = inner.slice(0, bracketIdx).trim();
    const iconName = inner.slice(bracketIdx + 2, -1);
    const sanitizedClass = sanitizeClassName(className);
    const icon = iconHtml(iconName);

    if (icon && sanitizedClass) {
      return `<span class="${sanitizedClass}">${icon}</span>`;
    }
    if (icon) {
      return icon;
    }
    return null;
  }

  // 3. Inline class: className: textContent (colon followed by space)
  const colonSpaceIdx = inner.indexOf(': ');
  if (colonSpaceIdx > 0) {
    const className = inner.slice(0, colonSpaceIdx).trim();
    const textContent = inner.slice(colonSpaceIdx + 2).trim();
    const sanitizedClass = sanitizeClassName(className);

    if (sanitizedClass) {
      const escapedContent = escapeText ? escapeHtml(textContent) : textContent;
      return `<span class="${sanitizedClass}">${escapedContent}</span>`;
    }
    return null;
  }

  return null;
}

/**
 * Parses text content and converts inline class syntax and icon syntax to HTML.
 *
 * Uses a character-by-character loop to avoid catastrophic backtracking from complex regex.
 *
 * @param content - The text content to parse
 * @param escapeText - Whether to escape HTML in the text portions (default: true)
 * @returns The parsed HTML string
 */
export function parseInlineClasses(content: string, escapeText: boolean = true): string {
  const maybeEscape = escapeText ? escapeHtml : (s: string) => s;
  let output = '';
  let i = 0;

  while (i < content.length) {
    if (content[i] !== '{') {
      // Accumulate plain text until next '{' or end
      const start = i;
      while (i < content.length && content[i] !== '{') i++;
      output += maybeEscape(content.substring(start, i));
      continue;
    }

    // Found '{' — scan for matching '}'
    const braceStart = i;
    i++; // skip '{'
    let depth = 1;
    while (i < content.length && depth > 0) {
      if (content[i] === '{') depth++;
      else if (content[i] === '}') depth--;
      i++;
    }

    if (depth !== 0) {
      // Unmatched brace — emit as literal text
      output += maybeEscape(content.substring(braceStart, i));
      continue;
    }

    // inner = content between the outermost braces (exclusive)
    const inner = content.substring(braceStart + 1, i - 1);

    const result = tryParseToken(inner, escapeText);
    if (result) {
      output += result;
    } else {
      output += maybeEscape('{' + inner + '}');
    }
  }

  return output;
}

/**
 * Checks if the content contains any inline class syntax or icon syntax.
 */
export function hasInlineClasses(content: string): boolean {
  let i = 0;

  while (i < content.length) {
    if (content[i] !== '{') {
      i++;
      continue;
    }

    // Found '{' — scan for matching '}'
    const braceStart = i;
    i++; // skip '{'
    let depth = 1;
    while (i < content.length && depth > 0) {
      if (content[i] === '{') depth++;
      else if (content[i] === '}') depth--;
      i++;
    }

    if (depth !== 0) continue;

    const inner = content.substring(braceStart + 1, i - 1);
    if (tryParseToken(inner, false) !== null) {
      return true;
    }
  }

  return false;
}
