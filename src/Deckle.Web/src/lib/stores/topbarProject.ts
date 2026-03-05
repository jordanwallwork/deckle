import { writable } from 'svelte/store';

export interface TopbarProject {
  ownerName: string;
  projectName: string;
  projectUrl: string;
}

export const topbarProject = writable<TopbarProject | null>(null);
