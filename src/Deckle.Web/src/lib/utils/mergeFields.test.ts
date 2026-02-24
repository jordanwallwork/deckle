import { describe, it, expect } from 'vitest';
import {
  toIdentifier,
  replaceMergeFields,
  parseDataRow,
  parseDataRows,
  evaluateVisibility,
  isElementVisible,
  evaluateExpression
} from './mergeFields';

describe('toIdentifier', () => {
  it('joins space-separated words into PascalCase from the second word onwards', () => {
    expect(toIdentifier('Hero Name')).toBe('HeroName');
    expect(toIdentifier('Attack Stat')).toBe('AttackStat');
  });

  it('strips parentheses and special characters', () => {
    expect(toIdentifier('HP (Max)')).toBe('HPMax');
  });

  it('preserves underscores', () => {
    expect(toIdentifier('already_valid')).toBe('already_valid');
  });

  it('returns a single word unchanged', () => {
    expect(toIdentifier('Name')).toBe('Name');
    expect(toIdentifier('HP')).toBe('HP');
  });
});

describe('replaceMergeFields', () => {
  it('substitutes a simple field reference', () => {
    expect(replaceMergeFields('Hello {{Name}}', { Name: 'World' })).toBe('Hello World');
  });

  it('evaluates arithmetic expressions', () => {
    expect(replaceMergeFields('Total: {{Price + Tax}}', { Price: '10', Tax: '2' })).toBe(
      'Total: 12'
    );
  });

  it('uses the fallback when the field is missing', () => {
    expect(replaceMergeFields('Count: {{Count|0}}', {})).toBe('Count: 0');
  });

  it('returns an empty string for a missing field with no fallback', () => {
    expect(replaceMergeFields('{{Missing}}', {})).toBe('');
  });

  it('strips surrounding quotes from the fallback value', () => {
    expect(replaceMergeFields('{{Name|"Unknown"}}', {})).toBe('Unknown');
  });

  it('leaves merge fields unreplaced when rowData is null and no fallback', () => {
    expect(replaceMergeFields('Hello {{Name}}', null)).toBe('Hello {{Name}}');
  });

  it('uses the fallback when rowData is null', () => {
    expect(replaceMergeFields('{{Name|Anonymous}}', null)).toBe('Anonymous');
  });

  it('passes through plain text with no merge fields', () => {
    expect(replaceMergeFields('No fields here', { Name: 'World' })).toBe('No fields here');
  });

  it('handles boolean field values', () => {
    expect(replaceMergeFields('{{IsHero}}', { IsHero: 'true' })).toBe('true');
  });
});

describe('parseDataRow', () => {
  it('maps headers to values applying identifier transformation', () => {
    expect(parseDataRow(['Hero Name', 'HP'], ['Wizard', '10'])).toEqual({
      HeroName: 'Wizard',
      HP: '10'
    });
  });

  it('fills empty strings for row values that are missing', () => {
    expect(parseDataRow(['Name', 'Type', 'Power'], ['Sword'])).toEqual({
      Name: 'Sword',
      Type: '',
      Power: ''
    });
  });
});

describe('parseDataRows', () => {
  it('returns an empty array when there are fewer than 2 rows', () => {
    expect(parseDataRows([])).toEqual([]);
    expect(parseDataRows([['Name', 'HP']])).toEqual([]);
  });

  it('parses the first row as headers and the rest as data', () => {
    const data = [
      ['Name', 'HP'],
      ['Wizard', '10'],
      ['Warrior', '15']
    ];
    expect(parseDataRows(data)).toEqual([
      { Name: 'Wizard', HP: '10' },
      { Name: 'Warrior', HP: '15' }
    ]);
  });
});

describe('evaluateVisibility', () => {
  it('returns false for an empty or undefined condition', () => {
    expect(evaluateVisibility('', { Name: 'test' })).toBe(false);
    expect(evaluateVisibility(undefined, { Name: 'test' })).toBe(false);
    expect(evaluateVisibility('  ', { Name: 'test' })).toBe(false);
  });

  it('returns false when rowData is null', () => {
    expect(evaluateVisibility('HasAbility', null)).toBe(false);
  });

  it('returns true when the condition evaluates to a truthy value', () => {
    expect(evaluateVisibility('HasAbility', { HasAbility: 'true' })).toBe(true);
  });

  it('returns false when the condition evaluates to a falsy value', () => {
    expect(evaluateVisibility('HasAbility', { HasAbility: 'false' })).toBe(false);
    expect(evaluateVisibility('Count', { Count: '0' })).toBe(false);
  });

  it('returns false when the condition throws an error', () => {
    expect(evaluateVisibility('!!!invalid', {})).toBe(false);
  });
});

describe('isElementVisible', () => {
  it('returns false when mode is "hide"', () => {
    expect(isElementVisible('hide', undefined, {})).toBe(false);
    expect(isElementVisible('hide', 'SomeCondition', { SomeCondition: 'true' })).toBe(false);
  });

  it('returns true when mode is anything other than "hide" or "conditional"', () => {
    expect(isElementVisible('show', undefined, {})).toBe(true);
    expect(isElementVisible(undefined, undefined, {})).toBe(true);
  });

  it('evaluates the condition when mode is "conditional"', () => {
    expect(isElementVisible('conditional', 'IsVisible', { IsVisible: 'true' })).toBe(true);
    expect(isElementVisible('conditional', 'IsVisible', { IsVisible: 'false' })).toBe(false);
  });
});

describe('evaluateExpression', () => {
  it('returns undefined for an empty expression', () => {
    expect(evaluateExpression('', {})).toBeUndefined();
    expect(evaluateExpression('  ', null)).toBeUndefined();
  });

  it('evaluates a literal arithmetic expression', () => {
    expect(evaluateExpression('2 + 3', null)).toBe(5);
  });

  it('evaluates an expression using row data variables', () => {
    // Count is converted to number 5 by toTypedContext
    expect(evaluateExpression('Count + 1', { Count: '5' })).toBe(6);
  });

  it('returns undefined when the expression cannot be evaluated', () => {
    expect(evaluateExpression('!!!@@@invalid', {})).toBeUndefined();
  });
});
