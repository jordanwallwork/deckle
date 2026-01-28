import { getContext, setContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';

const MAX_SCREEN_CONTEXT_KEY = 'maxScreen';

export function initMaxScreen(): Writable<boolean> {
  const store = writable<boolean>(false);
  setContext(MAX_SCREEN_CONTEXT_KEY, store);
  return store;
}

export function getMaxScreen(): Writable<boolean> {
  const store = getContext<Writable<boolean>>(MAX_SCREEN_CONTEXT_KEY);
  if (!store) {
    throw new Error(
      'MaxScreen context not found. Did you call initMaxScreen() in a parent layout?'
    );
  }
  return store;
}

export function setMaxScreen(value: boolean) {
  getMaxScreen().set(value);
}
