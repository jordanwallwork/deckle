import { writable } from 'svelte/store';

/**
 * Store for requesting a zoom-to-element action in the preview panel.
 * Set to an element ID to trigger zooming and panning to that element.
 * PreviewPanel resets this to null after handling the request.
 */
export const zoomToElementStore = writable<string | null>(null);
