import { fetchLiveScores, getMockScores, getMockOdds, fetchSuperBowlOdds } from './oddsService.js';
import { getGameData, saveGameData, updateScores, updateTeams } from './dataService.js';

// Auto-sync state
let syncState = {
  enabled: false,
  interval: null,
  lastSync: null,
  lastError: null,
  syncInterval: 10000, // 10 seconds
  gameId: null, // Track which game we're syncing
  useMockData: true // Use mock data when no API key
};

// Get current sync status
export function getSyncStatus() {
  return {
    enabled: syncState.enabled,
    lastSync: syncState.lastSync,
    lastError: syncState.lastError,
    syncInterval: syncState.syncInterval,
    gameId: syncState.gameId,
    useMockData: syncState.useMockData
  };
}

// Start auto-sync
export function startAutoSync(apiKey, options = {}) {
  if (syncState.enabled) {
    return { success: false, message: 'Auto-sync already running' };
  }

  syncState.useMockData = !apiKey;
  syncState.gameId = options.gameId || null;
  syncState.syncInterval = options.interval || 10000;

  // Do initial sync
  performSync(apiKey);

  // Set up interval
  syncState.interval = setInterval(() => {
    performSync(apiKey);
  }, syncState.syncInterval);

  syncState.enabled = true;
  console.log(`Auto-sync started (mock: ${syncState.useMockData}, interval: ${syncState.syncInterval}ms)`);

  return { success: true, message: 'Auto-sync started' };
}

// Stop auto-sync
export function stopAutoSync() {
  if (!syncState.enabled) {
    return { success: false, message: 'Auto-sync not running' };
  }

  if (syncState.interval) {
    clearInterval(syncState.interval);
    syncState.interval = null;
  }

  syncState.enabled = false;
  console.log('Auto-sync stopped');

  return { success: true, message: 'Auto-sync stopped' };
}

// Perform a single sync operation
async function performSync(apiKey) {
  try {
    let scoresData;
    let oddsData;

    if (syncState.useMockData) {
      // Use mock data with live simulation
      scoresData = getMockScores(true);
      oddsData = getMockOdds();
    } else {
      // Fetch real data
      scoresData = await fetchLiveScores(apiKey);
      oddsData = await fetchSuperBowlOdds(apiKey);
    }

    // Find the game to sync (first game or specific gameId)
    let game = scoresData.games[0];
    if (syncState.gameId) {
      game = scoresData.games.find(g => g.id === syncState.gameId) || game;
    }

    if (!game) {
      throw new Error('No game found to sync');
    }

    const gameData = getGameData();

    // Update teams if not locked (only sync teams before game is locked)
    if (!gameData.grid.locked) {
      // Find matching odds data for team abbreviations
      const oddsGame = oddsData.games.find(g => g.id === game.id) || oddsData.games[0];

      const homeTeam = {
        name: game.homeTeam,
        abbreviation: getTeamAbbreviation(game.homeTeam)
      };
      const awayTeam = {
        name: game.awayTeam,
        abbreviation: getTeamAbbreviation(game.awayTeam)
      };

      // Only update if teams changed
      if (gameData.teams.home.name !== homeTeam.name || gameData.teams.away.name !== awayTeam.name) {
        updateTeams(homeTeam, awayTeam);
        console.log(`Teams synced: ${awayTeam.name} @ ${homeTeam.name}`);
      }
    }

    // Update scores if game has scores
    if (game.scores) {
      const homeScore = parseInt(game.scores.home) || 0;
      const awayScore = parseInt(game.scores.away) || 0;

      // Only update if scores changed
      if (gameData.scores.home !== homeScore || gameData.scores.away !== awayScore) {
        updateScores(homeScore, awayScore);
        console.log(`Scores synced: ${awayScore} - ${homeScore}`);
      }
    }

    syncState.lastSync = new Date().toISOString();
    syncState.lastError = null;

  } catch (error) {
    console.error('Sync error:', error.message);
    syncState.lastError = error.message;
  }
}

// Manual sync (one-time)
export async function manualSync(apiKey) {
  await performSync(apiKey);
  return getSyncStatus();
}

// Helper to get team abbreviation from full name
function getTeamAbbreviation(teamName) {
  const abbreviations = {
    'Arizona Cardinals': 'ARI',
    'Atlanta Falcons': 'ATL',
    'Baltimore Ravens': 'BAL',
    'Buffalo Bills': 'BUF',
    'Carolina Panthers': 'CAR',
    'Chicago Bears': 'CHI',
    'Cincinnati Bengals': 'CIN',
    'Cleveland Browns': 'CLE',
    'Dallas Cowboys': 'DAL',
    'Denver Broncos': 'DEN',
    'Detroit Lions': 'DET',
    'Green Bay Packers': 'GB',
    'Houston Texans': 'HOU',
    'Indianapolis Colts': 'IND',
    'Jacksonville Jaguars': 'JAX',
    'Kansas City Chiefs': 'KC',
    'Las Vegas Raiders': 'LV',
    'Los Angeles Chargers': 'LAC',
    'Los Angeles Rams': 'LAR',
    'Miami Dolphins': 'MIA',
    'Minnesota Vikings': 'MIN',
    'New England Patriots': 'NE',
    'New Orleans Saints': 'NO',
    'New York Giants': 'NYG',
    'New York Jets': 'NYJ',
    'Philadelphia Eagles': 'PHI',
    'Pittsburgh Steelers': 'PIT',
    'San Francisco 49ers': 'SF',
    'Seattle Seahawks': 'SEA',
    'Tampa Bay Buccaneers': 'TB',
    'Tennessee Titans': 'TEN',
    'Washington Commanders': 'WAS'
  };

  return abbreviations[teamName] || teamName.substring(0, 3).toUpperCase();
}
