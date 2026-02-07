// Game statistics service
// Uses ESPN API for live data, falls back to mock data

import {
  getCurrentGameId,
  getTeamStatistics,
  getPlayerStatistics
} from './espnService.js';

// Mock data for when ESPN is unavailable or no game is live
const mockTeamStats = {
  home: {
    totalYards: 287,
    passingYards: 198,
    rushingYards: 89,
    firstDowns: 16,
    thirdDownPct: '5/11 (45%)',
    turnovers: 1,
    timeOfPossession: '18:24',
    sacks: 2,
    penalties: '4-35'
  },
  away: {
    totalYards: 312,
    passingYards: 241,
    rushingYards: 71,
    firstDowns: 19,
    thirdDownPct: '6/12 (50%)',
    turnovers: 0,
    timeOfPossession: '21:36',
    sacks: 1,
    penalties: '3-25'
  }
};

// Super Bowl LX mock player stats - Seahawks vs Patriots
const mockPlayerStats = {
  passing: [
    { name: 'S. Darnold', team: 'SEA', comp: 19, att: 28, yards: 234, td: 2, int: 0, rating: 115.3 },
    { name: 'D. Maye', team: 'NE', comp: 17, att: 26, yards: 198, td: 1, int: 1, rating: 88.7 }
  ],
  rushing: [
    { name: 'K. Walker III', team: 'SEA', carries: 18, yards: 82, avg: 4.6, td: 1, long: 19 },
    { name: 'R. Stevenson', team: 'NE', carries: 14, yards: 56, avg: 4.0, td: 0, long: 13 },
    { name: 'D. Maye', team: 'NE', carries: 6, yards: 34, avg: 5.7, td: 0, long: 16 },
    { name: 'T. Henderson', team: 'NE', carries: 4, yards: 18, avg: 4.5, td: 1, long: 9 }
  ],
  receiving: [
    { name: 'J. Smith-Njigba', team: 'SEA', rec: 8, targets: 11, yards: 112, avg: 14.0, td: 1, long: 34 },
    { name: 'S. Diggs', team: 'NE', rec: 5, targets: 8, yards: 47, avg: 9.4, td: 0, long: 16 },
    { name: 'C. Kupp', team: 'SEA', rec: 4, targets: 5, yards: 42, avg: 10.5, td: 1, long: 18 },
    { name: 'H. Henry', team: 'NE', rec: 4, targets: 6, yards: 52, avg: 13.0, td: 1, long: 22 },
    { name: 'R. Shaheed', team: 'SEA', rec: 3, targets: 5, yards: 38, avg: 12.7, td: 0, long: 21 },
    { name: 'A. Barner', team: 'SEA', rec: 3, targets: 4, yards: 28, avg: 9.3, td: 0, long: 14 },
    { name: 'K. Boutte', team: 'NE', rec: 2, targets: 4, yards: 31, avg: 15.5, td: 0, long: 19 }
  ]
};

// Configuration
let useEspnApi = true;
let cachedTeamStats = null;
let cachedPlayerStats = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 10000; // 10 seconds

/**
 * Get team statistics - tries ESPN first, falls back to mock
 */
export async function getTeamStats() {
  const now = Date.now();

  // Return cache if fresh
  if (cachedTeamStats && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedTeamStats;
  }

  if (useEspnApi) {
    try {
      const gameId = await getCurrentGameId();
      if (gameId) {
        const stats = await getTeamStatistics(gameId);
        if (stats) {
          cachedTeamStats = { ...stats, source: 'espn', mock: false };
          cacheTimestamp = now;
          return cachedTeamStats;
        }
      }
    } catch (error) {
      console.error('ESPN team stats error, using mock:', error.message);
    }
  }

  // Fall back to mock data
  cachedTeamStats = { ...mockTeamStats, source: 'mock', mock: true };
  cacheTimestamp = now;
  return cachedTeamStats;
}

/**
 * Get player game statistics - tries ESPN first, falls back to mock
 */
export async function getPlayerGameStats() {
  const now = Date.now();

  // Return cache if fresh
  if (cachedPlayerStats && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedPlayerStats;
  }

  if (useEspnApi) {
    try {
      const gameId = await getCurrentGameId();
      if (gameId) {
        const stats = await getPlayerStatistics(gameId);
        if (stats && stats.passing.length > 0) {
          cachedPlayerStats = { ...stats, source: 'espn', mock: false };
          cacheTimestamp = now;
          return cachedPlayerStats;
        }
      }
    } catch (error) {
      console.error('ESPN player stats error, using mock:', error.message);
    }
  }

  // Fall back to mock data
  cachedPlayerStats = { ...mockPlayerStats, source: 'mock', mock: true };
  cacheTimestamp = now;
  return cachedPlayerStats;
}

/**
 * Enable/disable ESPN API usage
 */
export function setUseEspnApi(enabled) {
  useEspnApi = enabled;
  // Clear cache when toggling
  cachedTeamStats = null;
  cachedPlayerStats = null;
}

/**
 * Check if using ESPN API
 */
export function isUsingEspnApi() {
  return useEspnApi;
}

/**
 * Clear stats cache
 */
export function clearStatsCache() {
  cachedTeamStats = null;
  cachedPlayerStats = null;
  cacheTimestamp = 0;
}

/**
 * Get mock team stats (always returns mock, for testing)
 */
export function getMockTeamStats() {
  return { ...mockTeamStats, source: 'mock', mock: true };
}

/**
 * Get mock player stats (always returns mock, for testing)
 */
export function getMockPlayerStats() {
  return { ...mockPlayerStats, source: 'mock', mock: true };
}
