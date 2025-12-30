/**
 * Game-themed error messages for HTTP status codes
 * Each status code has multiple flavor text options that are randomly selected
 */

export interface ErrorFlavor {
  title: string;
  flavorText: string;
}

const ERROR_FLAVORS: Record<number, ErrorFlavor[]> = {
  // 404 - Not Found
  404: [
    {
      title: "Missing Component",
      flavorText: "We checked the box, but this piece seems to be missing. Did it fall under the table?"
    },
    {
      title: "Fog of War",
      flavorText: "You've wandered into an unexplored tile that doesn't exist yet."
    },
    {
      title: "Empty Hex",
      flavorText: "You've landed on a space with no encounters. Roll for initiative to find your way back."
    },
    {
      title: "The Rulebook is Silent",
      flavorText: "We can't find any record of this page in the index."
    }
  ],

  // 400 - Bad Request
  400: [
    {
      title: "Illegal Move",
      flavorText: "The server can't process that action. Check the house rules and try again."
    },
    {
      title: "Invalid Play",
      flavorText: "You don't have the necessary resources to perform this action."
    },
    {
      title: "Table Talk",
      flavorText: "The game master is confused by your intent. Something in the request didn't translate."
    }
  ],

  // 401 - Unauthorized
  401: [
    {
      title: "Restricted Area",
      flavorText: "Only the Game Master can see what's behind this screen."
    },
    {
      title: "Roll for Charisma",
      flavorText: "Your current credentials aren't high enough to enter this dungeon."
    }
  ],

  // 403 - Forbidden
  403: [
    {
      title: "Restricted Area",
      flavorText: "Only the Game Master can see what's behind this screen."
    },
    {
      title: "Access Denied",
      flavorText: "You don't have permission to move that piece. Ask the table owner for access."
    }
  ],

  // 500-599 - Server Errors
  500: [
    {
      title: "Table Flip!",
      flavorText: "Something went wrong and the server flipped the board. We're picking up the pieces."
    },
    {
      title: "Analysis Paralysis",
      flavorText: "The server is overthinking its next move. Give it a minute to breathe."
    },
    {
      title: "Critical Fail",
      flavorText: "The server rolled a natural 1. We're working on a reroll!"
    }
  ],
  502: [
    {
      title: "Broken Connection",
      flavorText: "The server's dice tower is jammed. We're trying to clear it out."
    },
    {
      title: "Gateway Gridlock",
      flavorText: "There's a traffic jam at the game table. Please wait while we sort out turn order."
    }
  ],
  503: [
    {
      title: "Game Paused",
      flavorText: "The server is taking a break. We'll be back after this quick snack run."
    },
    {
      title: "Service Unavailable",
      flavorText: "All our game masters are busy. Please wait in the queue."
    }
  ],
  504: [
    {
      title: "Turn Timer Expired",
      flavorText: "The server took too long to make its move. We're rolling a timeout."
    }
  ]
};

// Fallback errors for unknown status codes
const FALLBACK_ERRORS: ErrorFlavor[] = [
  {
    title: "Unexpected Event",
    flavorText: "Something unusual happened that's not in the rulebook. We're consulting the errata."
  },
  {
    title: "House Rule Needed",
    flavorText: "This situation isn't covered by the standard rules. The game master is making a call."
  },
  {
    title: "Random Encounter",
    flavorText: "You've encountered an unexpected error. Roll a d20 to see what happens next."
  }
];

/**
 * Gets a random themed error message for the given HTTP status code
 * @param statusCode - HTTP status code (e.g., 404, 500)
 * @returns A randomly selected error flavor for that status code
 */
export function getErrorFlavor(statusCode: number): ErrorFlavor {
  // Normalize 5xx errors to use the same pool
  const normalizedCode = statusCode >= 500 && statusCode < 600
    ? Math.floor(statusCode / 10) * 10  // Round down to nearest 10
    : statusCode;

  const flavors = ERROR_FLAVORS[normalizedCode] || ERROR_FLAVORS[statusCode] || FALLBACK_ERRORS;
  const randomIndex = Math.floor(Math.random() * flavors.length);

  return flavors[randomIndex];
}

/**
 * Creates a complete error display object with both themed and technical information
 * @param statusCode - HTTP status code
 * @param technicalMessage - The original error message for debugging
 * @returns Object containing both the flavor text and technical details
 */
export function createThemedError(statusCode: number, technicalMessage: string) {
  const flavor = getErrorFlavor(statusCode);

  return {
    ...flavor,
    statusCode,
    technicalMessage
  };
}
