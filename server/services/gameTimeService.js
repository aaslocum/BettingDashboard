// Game Time Service
// Controls mock data behavior based on proximity to game time

// Super Bowl LX: February 8, 2026 at 6:30 PM ET
const GAME_TIME_ET = new Date('2026-02-08T18:30:00-05:00');
const MOCK_CUTOFF_HOURS = 6;

/**
 * Check if we should use mock data.
 * Returns true only if we're more than 6 hours before game time.
 * Once within 6 hours, all data should be real or empty (no faking).
 */
export function shouldUseMockData() {
  const now = new Date();
  const hoursUntilGame = (GAME_TIME_ET.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilGame > MOCK_CUTOFF_HOURS;
}

/**
 * Check if the game has started (past kickoff time)
 */
export function hasGameStarted() {
  return new Date() >= GAME_TIME_ET;
}

/**
 * Get hours until game time (negative if game has started)
 */
export function hoursUntilGame() {
  const now = new Date();
  return (GAME_TIME_ET.getTime() - now.getTime()) / (1000 * 60 * 60);
}

/**
 * Get game time info for API responses
 */
export function getGameTimeInfo() {
  const now = new Date();
  const hours = hoursUntilGame();
  return {
    gameTime: GAME_TIME_ET.toISOString(),
    mockCutoffHours: MOCK_CUTOFF_HOURS,
    hoursUntilGame: Math.round(hours * 10) / 10,
    useMockData: shouldUseMockData(),
    gameStarted: hasGameStarted(),
  };
}
