// ESPN API Service for live NFL game data
// Uses ESPN's public (unofficial) API endpoints

const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

// Cache for API responses
let cache = {
  scoreboard: null,
  scoreboardTimestamp: 0,
  gameData: {},
  gameDataTimestamp: {}
};

const CACHE_DURATION = 10000; // 10 seconds

/**
 * Fetch NFL scoreboard (all games)
 */
export async function fetchScoreboard() {
  const now = Date.now();

  // Return cached if fresh
  if (cache.scoreboard && (now - cache.scoreboardTimestamp) < CACHE_DURATION) {
    return { ...cache.scoreboard, cached: true };
  }

  try {
    const response = await fetch(`${ESPN_BASE_URL}/scoreboard`);
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }

    const data = await response.json();
    cache.scoreboard = data;
    cache.scoreboardTimestamp = now;

    return data;
  } catch (error) {
    console.error('Error fetching ESPN scoreboard:', error);
    // Return cached data if available, even if stale
    if (cache.scoreboard) {
      return { ...cache.scoreboard, cached: true, stale: true };
    }
    throw error;
  }
}

/**
 * Fetch detailed game summary including stats
 */
export async function fetchGameSummary(gameId) {
  const now = Date.now();

  // Return cached if fresh
  if (cache.gameData[gameId] && (now - cache.gameDataTimestamp[gameId]) < CACHE_DURATION) {
    return { ...cache.gameData[gameId], cached: true };
  }

  try {
    const response = await fetch(`${ESPN_BASE_URL}/summary?event=${gameId}`);
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }

    const data = await response.json();
    cache.gameData[gameId] = data;
    cache.gameDataTimestamp[gameId] = now;

    return data;
  } catch (error) {
    console.error('Error fetching ESPN game summary:', error);
    if (cache.gameData[gameId]) {
      return { ...cache.gameData[gameId], cached: true, stale: true };
    }
    throw error;
  }
}

/**
 * Find the Super Bowl game from scoreboard
 */
export async function findSuperBowl() {
  const scoreboard = await fetchScoreboard();

  // Look for Super Bowl or championship game
  const events = scoreboard.events || [];

  // Try to find Super Bowl by name
  let superBowl = events.find(e =>
    e.name?.toLowerCase().includes('super bowl') ||
    e.shortName?.toLowerCase().includes('super bowl')
  );

  // If no Super Bowl found, get the first/featured game
  if (!superBowl && events.length > 0) {
    superBowl = events[0];
  }

  return superBowl;
}

/**
 * Get live scores and team info
 */
export async function getLiveScores() {
  try {
    const game = await findSuperBowl();

    if (!game) {
      return null;
    }

    const competition = game.competitions?.[0];
    if (!competition) {
      return null;
    }

    const competitors = competition.competitors || [];
    const homeTeam = competitors.find(c => c.homeAway === 'home');
    const awayTeam = competitors.find(c => c.homeAway === 'away');

    return {
      gameId: game.id,
      gameName: game.name,
      status: game.status?.type?.description || 'Unknown',
      period: game.status?.period || 0,
      clock: game.status?.displayClock || '',
      teams: {
        home: {
          name: homeTeam?.team?.displayName || homeTeam?.team?.name || 'Home',
          abbreviation: homeTeam?.team?.abbreviation || 'HME',
          logo: homeTeam?.team?.logo,
          color: homeTeam?.team?.color
        },
        away: {
          name: awayTeam?.team?.displayName || awayTeam?.team?.name || 'Away',
          abbreviation: awayTeam?.team?.abbreviation || 'AWY',
          logo: awayTeam?.team?.logo,
          color: awayTeam?.team?.color
        }
      },
      scores: {
        home: parseInt(homeTeam?.score) || 0,
        away: parseInt(awayTeam?.score) || 0
      }
    };
  } catch (error) {
    console.error('Error getting live scores:', error);
    return null;
  }
}

/**
 * Get detailed team statistics
 */
export async function getTeamStatistics(gameId) {
  try {
    const summary = await fetchGameSummary(gameId);

    const boxscore = summary.boxscore;
    if (!boxscore) {
      return null;
    }

    const teams = boxscore.teams || [];
    const homeTeam = teams.find(t => t.homeAway === 'home');
    const awayTeam = teams.find(t => t.homeAway === 'away');

    const parseStats = (team) => {
      const stats = {};
      (team?.statistics || []).forEach(stat => {
        stats[stat.name] = stat.displayValue;
      });
      return stats;
    };

    const homeStats = parseStats(homeTeam);
    const awayStats = parseStats(awayTeam);

    return {
      home: {
        totalYards: parseInt(homeStats.totalYards) || 0,
        passingYards: parseInt(homeStats.netPassingYards) || 0,
        rushingYards: parseInt(homeStats.rushingYards) || 0,
        firstDowns: parseInt(homeStats.firstDowns) || 0,
        thirdDownPct: homeStats.thirdDownEff || '0/0 (0%)',
        turnovers: parseInt(homeStats.turnovers) || 0,
        timeOfPossession: homeStats.possessionTime || '00:00',
        sacks: parseInt(homeStats.sacks) || 0,
        penalties: homeStats.totalPenaltiesYards || '0-0'
      },
      away: {
        totalYards: parseInt(awayStats.totalYards) || 0,
        passingYards: parseInt(awayStats.netPassingYards) || 0,
        rushingYards: parseInt(awayStats.rushingYards) || 0,
        firstDowns: parseInt(awayStats.firstDowns) || 0,
        thirdDownPct: awayStats.thirdDownEff || '0/0 (0%)',
        turnovers: parseInt(awayStats.turnovers) || 0,
        timeOfPossession: awayStats.possessionTime || '00:00',
        sacks: parseInt(awayStats.sacks) || 0,
        penalties: awayStats.totalPenaltiesYards || '0-0'
      }
    };
  } catch (error) {
    console.error('Error getting team statistics:', error);
    return null;
  }
}

/**
 * Get player statistics
 */
export async function getPlayerStatistics(gameId) {
  try {
    const summary = await fetchGameSummary(gameId);

    const boxscore = summary.boxscore;
    if (!boxscore) {
      return null;
    }

    const players = boxscore.players || [];

    const passing = [];
    const rushing = [];
    const receiving = [];

    players.forEach(teamPlayers => {
      const teamAbbr = teamPlayers.team?.abbreviation || '';

      (teamPlayers.statistics || []).forEach(statCategory => {
        const statType = statCategory.name;
        const statLabels = statCategory.labels || [];

        (statCategory.athletes || []).forEach(athlete => {
          const playerName = athlete.athlete?.displayName || 'Unknown';
          const stats = athlete.stats || [];

          // Create stat object from labels and values
          const statObj = {};
          statLabels.forEach((label, idx) => {
            statObj[label] = stats[idx];
          });

          if (statType === 'passing' && stats.length > 0) {
            const compAtt = (statObj['C/ATT'] || '0/0').split('/');
            passing.push({
              name: playerName,
              team: teamAbbr,
              comp: parseInt(compAtt[0]) || 0,
              att: parseInt(compAtt[1]) || 0,
              yards: parseInt(statObj['YDS']) || 0,
              td: parseInt(statObj['TD']) || 0,
              int: parseInt(statObj['INT']) || 0,
              rating: parseFloat(statObj['QBR'] || statObj['RTG']) || 0
            });
          }

          if (statType === 'rushing' && stats.length > 0) {
            rushing.push({
              name: playerName,
              team: teamAbbr,
              carries: parseInt(statObj['CAR']) || 0,
              yards: parseInt(statObj['YDS']) || 0,
              avg: parseFloat(statObj['AVG']) || 0,
              td: parseInt(statObj['TD']) || 0,
              long: parseInt(statObj['LNG']) || 0
            });
          }

          if (statType === 'receiving' && stats.length > 0) {
            receiving.push({
              name: playerName,
              team: teamAbbr,
              rec: parseInt(statObj['REC']) || 0,
              targets: parseInt(statObj['TGTS']) || 0,
              yards: parseInt(statObj['YDS']) || 0,
              avg: parseFloat(statObj['AVG']) || 0,
              td: parseInt(statObj['TD']) || 0,
              long: parseInt(statObj['LNG']) || 0
            });
          }
        });
      });
    });

    // Sort by yards descending
    passing.sort((a, b) => b.yards - a.yards);
    rushing.sort((a, b) => b.yards - a.yards);
    receiving.sort((a, b) => b.yards - a.yards);

    return { passing, rushing, receiving };
  } catch (error) {
    console.error('Error getting player statistics:', error);
    return null;
  }
}

/**
 * Clear cache
 */
export function clearCache() {
  cache = {
    scoreboard: null,
    scoreboardTimestamp: 0,
    gameData: {},
    gameDataTimestamp: {}
  };
}

/**
 * Get current game ID (cached)
 */
let currentGameId = null;

export async function getCurrentGameId() {
  if (currentGameId) {
    return currentGameId;
  }

  const game = await findSuperBowl();
  if (game) {
    currentGameId = game.id;
  }
  return currentGameId;
}

export function setCurrentGameId(gameId) {
  currentGameId = gameId;
}
