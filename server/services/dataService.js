import {
  getGame,
  saveGame,
  getGamesIndex,
  getDefaultGameId,
  createGame as createNewGame,
  migrateExistingGame
} from './gamesService.js';

// Initialize - migrate existing game if needed
let initialized = false;
function ensureInitialized() {
  if (!initialized) {
    migrateExistingGame();
    initialized = true;
  }
}

// Get current game ID (from parameter or default)
function resolveGameId(gameId) {
  ensureInitialized();
  if (gameId) return gameId;
  return getDefaultGameId();
}

// Read game data
export function getGameData(gameId) {
  const resolvedId = resolveGameId(gameId);
  return getGame(resolvedId);
}

// Write game data
export function saveGameData(data) {
  return saveGame(data);
}

// Reset game to default state
export function resetGame(gameId) {
  const resolvedId = resolveGameId(gameId);
  const gameData = getGame(resolvedId);

  // Keep the id, name, and betAmount, reset everything else
  const prizes = calculatePrizes(gameData.betAmount);

  const resetData = {
    ...gameData,
    teams: {
      home: { name: 'Team A', abbreviation: 'TMA' },
      away: { name: 'Team B', abbreviation: 'TMB' }
    },
    grid: {
      locked: false,
      squares: Array(100).fill(null),
      homeNumbers: null,
      awayNumbers: null
    },
    scores: {
      home: 0,
      away: 0
    },
    quarters: {
      q1: { completed: false, winner: null, prize: prizes.q1 },
      q2: { completed: false, winner: null, prize: prizes.q2 },
      q3: { completed: false, winner: null, prize: prizes.q3 },
      q4: { completed: false, winner: null, prize: prizes.q4 }
    },
    gameStatus: 'setup'
  };

  return saveGame(resetData);
}

// Calculate prizes based on bet amount
function calculatePrizes(betAmount) {
  const totalPool = betAmount * 100;
  return {
    q1: Math.round(totalPool * 0.15),
    q2: Math.round(totalPool * 0.30),
    q3: Math.round(totalPool * 0.15),
    q4: Math.round(totalPool * 0.40)
  };
}

// Claim a square
export function claimSquare(index, playerName, gameId) {
  const data = getGameData(gameId);

  if (data.grid.locked) {
    throw new Error('Grid is locked');
  }

  if (index < 0 || index >= 100) {
    throw new Error('Invalid square index');
  }

  if (data.grid.squares[index] !== null) {
    throw new Error('Square already claimed');
  }

  data.grid.squares[index] = playerName;
  return saveGameData(data);
}

// Bulk claim squares - distribute remaining squares evenly among participants
export function bulkClaimSquares(initialsList, gameId) {
  const data = getGameData(gameId);

  if (data.grid.locked) {
    throw new Error('Grid is locked');
  }

  if (!initialsList || initialsList.length === 0) {
    throw new Error('No participants provided');
  }

  // Validate all initials
  const validatedInitials = initialsList.map(initials => {
    const cleaned = initials.trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (cleaned.length < 2 || cleaned.length > 4) {
      throw new Error(`Invalid initials: ${initials} (must be 2-4 letters)`);
    }
    return cleaned;
  });

  // Find unclaimed squares
  const unclaimedIndices = [];
  data.grid.squares.forEach((square, index) => {
    if (square === null) {
      unclaimedIndices.push(index);
    }
  });

  if (unclaimedIndices.length === 0) {
    throw new Error('No unclaimed squares available');
  }

  // Shuffle unclaimed indices for random distribution
  for (let i = unclaimedIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unclaimedIndices[i], unclaimedIndices[j]] = [unclaimedIndices[j], unclaimedIndices[i]];
  }

  // Calculate even distribution
  const count = validatedInitials.length;
  const totalSquares = unclaimedIndices.length;
  const baseSquares = Math.floor(totalSquares / count);
  const extraSquares = totalSquares % count;

  // Assign squares
  let squareIdx = 0;
  const assignments = [];

  validatedInitials.forEach((initials, participantIdx) => {
    const squaresToAssign = baseSquares + (participantIdx < extraSquares ? 1 : 0);

    for (let i = 0; i < squaresToAssign && squareIdx < totalSquares; i++) {
      const gridIndex = unclaimedIndices[squareIdx];
      data.grid.squares[gridIndex] = initials;
      assignments.push({ initials, squareIndex: gridIndex });
      squareIdx++;
    }
  });

  saveGameData(data);

  return {
    assignments,
    totalAssigned: assignments.length,
    participants: validatedInitials.length
  };
}

// Lock grid and randomize numbers
export function lockAndRandomize(gameId) {
  const data = getGameData(gameId);

  // Check all squares are claimed
  const unclaimedCount = data.grid.squares.filter(s => s === null).length;
  if (unclaimedCount > 0) {
    throw new Error(`Cannot lock: ${unclaimedCount} squares still unclaimed`);
  }

  // Shuffle function
  const shuffle = (arr) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  data.grid.homeNumbers = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  data.grid.awayNumbers = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  data.grid.locked = true;
  data.gameStatus = 'active';

  return saveGameData(data);
}

// Update teams
export function updateTeams(homeTeam, awayTeam, gameId) {
  const data = getGameData(gameId);
  data.teams.home = homeTeam;
  data.teams.away = awayTeam;
  return saveGameData(data);
}

// Update scores
export function updateScores(homeScore, awayScore, gameId) {
  const data = getGameData(gameId);
  data.scores.home = homeScore;
  data.scores.away = awayScore;
  return saveGameData(data);
}

// Find winner for current scores
export function findWinnerForScores(homeScore, awayScore, gameId) {
  const data = getGameData(gameId);

  if (!data.grid.locked || !data.grid.homeNumbers || !data.grid.awayNumbers) {
    return null;
  }

  const homeLastDigit = homeScore % 10;
  const awayLastDigit = awayScore % 10;

  const homeCol = data.grid.homeNumbers.indexOf(homeLastDigit);
  const awayRow = data.grid.awayNumbers.indexOf(awayLastDigit);

  const squareIndex = awayRow * 10 + homeCol;
  return {
    player: data.grid.squares[squareIndex],
    squareIndex,
    homeLastDigit,
    awayLastDigit
  };
}

// Mark quarter winner
export function markQuarterWinner(quarter, gameId) {
  const data = getGameData(gameId);
  const winner = findWinnerForScores(data.scores.home, data.scores.away, gameId);

  if (!winner) {
    throw new Error('Cannot determine winner - grid not locked');
  }

  data.quarters[quarter].completed = true;
  data.quarters[quarter].winner = {
    player: winner.player,
    squareIndex: winner.squareIndex,
    homeScore: data.scores.home,
    awayScore: data.scores.away
  };

  if (quarter === 'q4') {
    data.gameStatus = 'completed';
  }

  return saveGameData(data);
}

// Get player statistics
export function getPlayerStats(gameId) {
  const data = getGameData(gameId);
  const { grid, quarters, betAmount = 1 } = data;
  const { squares } = grid;

  // Count squares per player
  const playerSquares = {};
  squares.forEach((initials, index) => {
    if (initials) {
      if (!playerSquares[initials]) {
        playerSquares[initials] = { squares: [], count: 0 };
      }
      playerSquares[initials].squares.push(index);
      playerSquares[initials].count++;
    }
  });

  // Calculate winnings per player
  const playerWinnings = {};
  Object.entries(quarters).forEach(([quarterKey, quarter]) => {
    if (quarter.completed && quarter.winner) {
      const winner = quarter.winner.player;
      if (!playerWinnings[winner]) {
        playerWinnings[winner] = { total: 0, quarters: [] };
      }
      playerWinnings[winner].total += quarter.prize;
      playerWinnings[winner].quarters.push({
        quarter: quarterKey,
        prize: quarter.prize
      });
    }
  });

  // Combine stats
  const allPlayers = new Set([
    ...Object.keys(playerSquares),
    ...Object.keys(playerWinnings)
  ]);

  const players = Array.from(allPlayers).map(initials => {
    const squareCount = playerSquares[initials]?.count || 0;
    const betAmountTotal = squareCount * betAmount;
    const winnings = playerWinnings[initials]?.total || 0;
    const net = winnings - betAmountTotal;

    return {
      initials,
      squareCount,
      betAmount: betAmountTotal,
      winnings,
      net,
      quarterWins: playerWinnings[initials]?.quarters || []
    };
  });

  // Sort by net descending
  players.sort((a, b) => b.net - a.net || b.squareCount - a.squareCount);

  const totals = {
    totalSquares: squares.filter(s => s !== null).length,
    totalBets: squares.filter(s => s !== null).length * betAmount,
    totalPaidOut: Object.values(quarters)
      .filter(q => q.completed)
      .reduce((sum, q) => sum + q.prize, 0),
    totalPrizePool: Object.values(quarters).reduce((sum, q) => sum + q.prize, 0),
    betAmountPerSquare: betAmount
  };

  return { players, totals };
}

// Export for backwards compatibility
export { getGamesIndex, getDefaultGameId } from './gamesService.js';
