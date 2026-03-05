import { writable } from 'svelte/store';

export interface TopbarTab {
  name: string;
  path: string;
}

export const topbarTabs = writable<TopbarTab[]>([]);
