export type SortDirection = 'asc' | 'desc';

/** The active column sort of a table, keyed by the table's own sort keys */
export interface SortState<K extends string = string> {
  sortBy: K;
  sortDir: SortDirection;
}
