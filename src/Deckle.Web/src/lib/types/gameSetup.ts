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

/**
 * Full game setup including the setup DSL document. Mirrors the backend
 * `GameSetupDto`. The `document` is passed through verbatim (the server does not
 * interpret it), so it is typed `unknown` here — the Play flow (#120) validates
 * and runs it through the game runner, which narrows it to a `GameSetup`.
 */
export interface GameSetupDetail extends GameSetupSummary {
  document: unknown;
}
