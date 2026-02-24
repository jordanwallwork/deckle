import { describe, it, expect } from 'vitest';
import { parseCSVData } from './dataSource.utils';

describe('parseCSVData', () => {
  describe('headers', () => {
    it('extracts headers from the first row', () => {
      const { headers } = parseCSVData('Name,Age\nAlice,30');
      expect(headers).toEqual(['Name', 'Age']);
    });

    it('handles quoted headers', () => {
      const { headers } = parseCSVData('"Name","Age"\nAlice,30');
      expect(headers).toEqual(['Name', 'Age']);
    });

    it('trims whitespace from header values', () => {
      const { headers } = parseCSVData(' Name , Age \nAlice,30');
      expect(headers).toEqual(['Name', 'Age']);
    });

    it('filters out empty header columns', () => {
      const { headers } = parseCSVData('Name,,Age\nAlice,,30');
      expect(headers).toEqual(['Name', 'Age']);
    });
  });

  describe('rowCount', () => {
    it('counts non-empty data rows', () => {
      const { rowCount } = parseCSVData('Name,Age\nAlice,30\nBob,25');
      expect(rowCount).toBe(2);
    });

    it('returns 0 when there are no data rows', () => {
      const { rowCount } = parseCSVData('Name,Age');
      expect(rowCount).toBe(0);
    });

    it('does not count the header row', () => {
      const { rowCount } = parseCSVData('Name,HP,Attack\nWizard,10,3');
      expect(rowCount).toBe(1);
    });

    it('ignores trailing empty lines', () => {
      const { rowCount } = parseCSVData('Name,Age\nAlice,30\n');
      expect(rowCount).toBe(1);
    });

    it('ignores multiple trailing empty lines', () => {
      const { rowCount } = parseCSVData('Name,Age\nAlice,30\n\n\n');
      expect(rowCount).toBe(1);
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
