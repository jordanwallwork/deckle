import { getContext, setContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';
import type { BreadcrumbItem } from '$lib/types/breadcrumb';

const BREADCRUMB_CONTEXT_KEY = 'breadcrumbs';

export function initBreadcrumbs(initialItems: BreadcrumbItem[] = []): Writable<BreadcrumbItem[]> {
  const store = writable<BreadcrumbItem[]>(initialItems);
  setContext(BREADCRUMB_CONTEXT_KEY, store);
  return store;
}

export function getBreadcrumbs(): Writable<BreadcrumbItem[]> {
  const store = getContext<Writable<BreadcrumbItem[]>>(BREADCRUMB_CONTEXT_KEY);
  if (!store) {
    throw new Error(
      'Breadcrumb context not found. Did you call initBreadcrumbs() in a parent layout?'
    );
  }
  return store;
}

export function setBreadcrumbs(value: BreadcrumbItem[]) {
  getBreadcrumbs().set(value);
}
