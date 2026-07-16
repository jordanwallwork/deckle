// Document-level helpers for the setup DSL.

import { CURRENT_SETUP_VERSION, type GameSetup } from './types';

/**
 * A fresh, empty setup document at the current schema version. An empty program
 * (no options/blueprints/steps) is trivially valid, so a newly created setup
 * starts in a valid state and can be opened straight in the editor.
 */
export function emptyGameSetup(): GameSetup {
	return {
		version: CURRENT_SETUP_VERSION,
		minPlayers: 1,
		maxPlayers: 4,
		options: [],
		blueprints: [],
		setup: []
	};
}
