import { getMockScores, getMockOdds } from './oddsService.js';
import { getGameData, updateScores, updateTeams } from './dataService.js';
import { getLiveScores, setCurrentGameId } from './espnService.js';

// Auto-sync state
let syncState = {
  enabled: false,
  interval: null,
  lastSync: null,
  lastError: null,
  syncInterval: 10000, // 10 seconds
  gameId: null, // Track which game we're syncing
  useEspn: true, // Use ESPN API by default
  useMockData: false // Fall back to mock data
};

// Get current sync status
export function getSyncStatus() {
  return {
    enabled: syncState.enabled,
    lastSync: syncState.lastSync,
    lastError: syncState.lastError,
    syncInterval: syncState.syncInterval,
    gameId: syncState.gameId,
    useEspn: syncState.useEspn,
    useMockData: syncState.useMockData,
    source: syncState.useEspn ? 'ESPN' : (syncState.useMockData ? 'Mock' : 'Odds API')
  };
}

// Start auto-sync
export function startAutoSync(apiKey, options = {}) {
  if (syncState.enabled) {
    return { success: false, message: 'Auto-sync already running' };
  }

  // Prefer ESPN, fall back to Odds API if key provided, otherwise mock
  syncState.useEspn = options.useEspn !== false;
  syncState.useMockData = !syncState.useEspn && !apiKey;
  syncState.gameId = options.gameId || null;
  syncState.syncInterval = options.interval || 10000;

  if (syncState.gameId) {
    setCurrentGameId(syncState.gameId);
  }

  // Do initial sync
  performSync(apiKey);

  // Set up interval
  syncState.interval = setInterval(() => {
    performSync(apiKey);
  }, syncState.syncInterval);

  syncState.enabled = true;
  const source = syncState.useEspn ? 'ESPN' : (syncState.useMockData ? 'Mock' : 'Odds API');
  console.log(`Auto-sync started (source: ${source}, interval: ${syncState.syncInterval}ms)`);

  return { success: true, message: `Auto-sync started (${source})` };
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
    let teamsData = null;
    let scoresData = null;

    // Try ESPN first
    if (syncState.useEspn) {
      try {
        const espnData = await getLiveScores();
        if (espnData) {
          teamsData = espnData.teams;
          scoresData = espnData.scores;

          // Store game ID for stats lookup
          if (espnData.gameId) {
            setCurrentGameId(espnData.gameId);
            syncState.gameId = espnData.gameId;
          }
        }
      } catch (espnError) {
        console.warn('ESPN sync failed, trying fallback:', espnError.message);
      }
    }

    // Fall back to mock data if ESPN failed or disabled
    if (!teamsData && syncState.useMockData) {
      const mockData = getMockScores(true);
      const game = mockData.games[0];
      if (game) {
        teamsData = {
          home: { name: game.homeTeam, abbreviation: getTeamAbbreviation(game.homeTeam) },
          away: { name: game.awayTeam, abbreviation: getTeamAbbreviation(game.awayTeam) }
        };
        scoresData = game.scores;
      }
    }

    // Update game data if we got something
    const gameData = getGameData();

    if (teamsData && !gameData.grid.locked) {
      // Only update teams before grid is locked
      if (gameData.teams.home.name !== teamsData.home.name ||
          gameData.teams.away.name !== teamsData.away.name) {
        updateTeams(teamsData.home, teamsData.away);
        console.log(`Teams synced: ${teamsData.away.name} @ ${teamsData.home.name}`);
      }
    }

    if (scoresData) {
      const homeScore = parseInt(scoresData.home) || 0;
      const awayScore = parseInt(scoresData.away) || 0;

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
export function getTeamAbbreviation(teamName) {
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
