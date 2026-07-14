import { describe, it, expect } from 'vitest';
import { parseCSVData } from './dataSource.utils';

describe('parseCSVData', () => {
  describe('headers', () => {
    it.each([
      ['extracts headers from the first row', 'Name,Age\nAlice,30'],
      ['handles quoted headers', '"Name","Age"\nAlice,30'],
      ['trims whitespace from header values', ' Name , Age \nAlice,30'],
      ['filters out empty header columns', 'Name,,Age\nAlice,,30']
    ])('%s', (_description, csvText) => {
      const { headers } = parseCSVData(csvText);
      expect(headers).toEqual(['Name', 'Age']);
    });
  });

  describe('rowCount', () => {
    it.each([
      ['counts non-empty data rows', 'Name,Age\nAlice,30\nBob,25', 2],
      ['returns 0 when there are no data rows', 'Name,Age', 0],
      ['does not count the header row', 'Name,HP,Attack\nWizard,10,3', 1],
      ['ignores trailing empty lines', 'Name,Age\nAlice,30\n', 1],
      ['ignores multiple trailing empty lines', 'Name,Age\nAlice,30\n\n\n', 1]
    ])('%s', (_description, csvText, expected) => {
      const { rowCount } = parseCSVData(csvText);
      expect(rowCount).toBe(expected);
    });
  });

  describe('quoted fields', () => {
    it('handles quoted fields containing commas', () => {
      const { headers, rowCount } = parseCSVData('Name,Location\n"Smith, John","New York, NY"');
      expect(headers).toEqual(['Name', 'Location']);
      expect(rowCount).toBe(1);
    });

    it('handles escaped quotes inside quoted fields', () => {
      // CSV value "He said ""hello""" should parse as: He said "hello"
      const { rowCount } = parseCSVData('Quote\n"He said ""hello"""');
      expect(rowCount).toBe(1);
    });
  });
});
