import { getContext, setContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';

const DATA_SOURCE_ROW_CONTEXT_KEY = 'dataSourceRow';

export type DataSourceRowData = Record<string, string> | null;

/**
 * Initializes the data source row store.
 * This should be called in ComponentEditor or a parent component.
 */
export function initDataSourceRow(
  initialData: DataSourceRowData = null
): Writable<DataSourceRowData> {
  const store = writable<DataSourceRowData>(initialData);
  setContext(DATA_SOURCE_ROW_CONTEXT_KEY, store);
  return store;
}

/**
 * Gets the data source row store from context.
 * Returns the currently selected data source row as a Record<string, string>.
 * Note: This must be called during component initialization (not in async functions or effects).
 * Store the reference and use it later: const store = getDataSourceRow(); store.set(data);
 */
export function getDataSourceRow(): Writable<DataSourceRowData> {
  const store = getContext<Writable<DataSourceRowData>>(DATA_SOURCE_ROW_CONTEXT_KEY);
  if (!store) {
    throw new Error(
      'DataSourceRow context not found. Did you call initDataSourceRow() in ComponentEditor?'
    );
  }
  return store;
}
