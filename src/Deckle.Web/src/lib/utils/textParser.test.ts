import { describe, it, expect } from 'vitest';
import { parseInlineClasses, hasInlineClasses } from './textParser';

describe('parseInlineClasses', () => {
  it('returns plain text unchanged', () => {
    expect(parseInlineClasses('Hello world')).toBe('Hello world');
  });

  it('converts {className: text} to a <span>', () => {
    expect(parseInlineClasses('{highlight: world}')).toBe(
      '<span class="highlight">world</span>'
    );
  });

  it('converts {[icon-name]} to a regular <i> tag', () => {
    expect(parseInlineClasses('{[address-card]}')).toBe(
      '<i class="fa-regular fa-address-card"></i>'
    );
  });

  it('converts {[s:icon-name]} to a solid <i> tag', () => {
    expect(parseInlineClasses('{[s:crown]}')).toBe('<i class="fa-solid fa-crown"></i>');
  });

  it('converts {className:[icon-name]} to a span wrapping the icon', () => {
    expect(parseInlineClasses('{bigRed:[s:crown]}')).toBe(
      '<span class="bigRed"><i class="fa-solid fa-crown"></i></span>'
    );
  });

  it('handles mixed plain text and syntax', () => {
    expect(parseInlineClasses('Hello {highlight: world}!')).toBe(
      'Hello <span class="highlight">world</span>!'
    );
  });

  it('escapes HTML in plain text by default', () => {
    expect(parseInlineClasses('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;/b&gt;');
  });

  it('does not escape HTML when escapeText is false', () => {
    expect(parseInlineClasses('<b>bold</b>', false)).toBe('<b>bold</b>');
  });

  it('sanitizes the class name and still renders the span when characters remain after stripping', () => {
    // sanitizeClassName strips < and >, leaving 'badclass' — the span is still generated
    expect(parseInlineClasses('{bad<class>: text}')).toBe('<span class="badclass">text</span>');
  });

  it('emits literal text when sanitization removes the entire class name', () => {
    // className '<>' → sanitized to '' → no span, falls back to literal text
    expect(parseInlineClasses('{<>: text}')).toBe('{&lt;&gt;: text}');
  });

  it('preserves unrecognized brace patterns as literal text', () => {
    expect(parseInlineClasses('{notaclass}')).toBe('{notaclass}');
  });

  it('handles an empty string', () => {
    expect(parseInlineClasses('')).toBe('');
  });

  it('handles unmatched opening brace as literal text', () => {
    const result = parseInlineClasses('open { brace');
    expect(result).toBe('open { brace');
  });
});

describe('hasInlineClasses', () => {
  it('returns false for plain text', () => {
    expect(hasInlineClasses('Hello world')).toBe(false);
  });

  it('returns true for inline class syntax', () => {
    expect(hasInlineClasses('{highlight: text}')).toBe(true);
  });

  it('returns true for icon syntax', () => {
    expect(hasInlineClasses('{[star]}')).toBe(true);
  });

  it('returns true for solid icon syntax', () => {
    expect(hasInlineClasses('{[s:crown]}')).toBe(true);
  });

  it('returns false for unrecognized brace patterns', () => {
    expect(hasInlineClasses('{notaclass}')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasInlineClasses('')).toBe(false);
  });
});
