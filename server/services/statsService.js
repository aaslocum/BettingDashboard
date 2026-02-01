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

const mockPlayerStats = {
  passing: [
    { name: 'P. Mahomes', team: 'KC', comp: 18, att: 24, yards: 198, td: 2, int: 0, rating: 128.5 },
    { name: 'J. Hurts', team: 'PHI', comp: 21, att: 29, yards: 241, td: 1, int: 1, rating: 98.2 }
  ],
  rushing: [
    { name: 'I. Pacheco', team: 'KC', carries: 12, yards: 67, avg: 5.6, td: 1, long: 18 },
    { name: 'S. Barkley', team: 'PHI', carries: 14, yards: 58, avg: 4.1, td: 0, long: 12 },
    { name: 'J. Hurts', team: 'PHI', carries: 4, yards: 13, avg: 3.3, td: 1, long: 8 }
  ],
  receiving: [
    { name: 'T. Kelce', team: 'KC', rec: 7, targets: 9, yards: 89, avg: 12.7, td: 1, long: 24 },
    { name: 'A.J. Brown', team: 'PHI', rec: 6, targets: 8, yards: 102, avg: 17.0, td: 1, long: 34 },
    { name: 'D. Smith', team: 'PHI', rec: 5, targets: 7, yards: 67, avg: 13.4, td: 0, long: 22 },
    { name: 'R. Rice', team: 'KC', rec: 4, targets: 6, yards: 52, avg: 13.0, td: 1, long: 19 }
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
