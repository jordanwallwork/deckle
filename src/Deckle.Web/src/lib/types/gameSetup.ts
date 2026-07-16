// Game setup entity types

/**
 * Lightweight summary of a game setup for list views (the Play/setup picker).
 * Mirrors the backend `GameSetupSummaryDto` — omits the (potentially large)
 * setup document; exposes only what the picker needs.
 */
export interface GameSetupSummary {
  id: string;
  projectId: string;
  name: string;
  isValid: boolean;
  createdAt: string;
  updatedAt: string;
}
