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
  const data = getGame(resolvedId);
  // Ensure players and bets arrays exist for backwards compatibility
  if (!data.players) {
    data.players = [];
  }
  if (!data.bets) {
    data.bets = [];
  }
  return data;
}

// Write game data
export function saveGameData(data) {
  return saveGame(data);
}

// Default prize distribution
const DEFAULT_PRIZE_DISTRIBUTION = {
  q1: 0.15,
  q2: 0.30,
  q3: 0.15,
  q4: 0.40
};

// Reset game to default state
export function resetGame(gameId) {
  const resolvedId = resolveGameId(gameId);
  const gameData = getGame(resolvedId);

  // Keep configuration (id, name, betAmount, prizeDistribution, teams, players), reset game state
  const distribution = gameData.prizeDistribution || DEFAULT_PRIZE_DISTRIBUTION;
  const prizes = calculatePrizes(gameData.betAmount, distribution);

  const resetData = {
    ...gameData,
    // Preserve teams — they are configuration, not game state
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
    gameStatus: 'setup',
    bets: []
  };

  return saveGame(resetData);
}

// Calculate prizes based on bet amount and distribution
function calculatePrizes(betAmount, distribution = DEFAULT_PRIZE_DISTRIBUTION) {
  const totalPool = betAmount * 100;
  return {
    q1: Math.round(totalPool * distribution.q1),
    q2: Math.round(totalPool * distribution.q2),
    q3: Math.round(totalPool * distribution.q3),
    q4: Math.round(totalPool * distribution.q4)
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

// Unclaim a square
export function unclaimSquare(index, playerName, gameId) {
  const data = getGameData(gameId);

  if (data.grid.locked) {
    throw new Error('Grid is locked');
  }

  if (index < 0 || index >= 100) {
    throw new Error('Invalid square index');
  }

  if (data.grid.squares[index] === null) {
    throw new Error('Square is not claimed');
  }

  if (data.grid.squares[index] !== playerName) {
    throw new Error('You can only unclaim your own squares');
  }

  data.grid.squares[index] = null;
  return saveGameData(data);
}

// Bulk claim squares - distribute remaining squares evenly among participants
export function bulkClaimSquares(initialsList, gameId) {
  const data = getGameData(gameId);
  ensurePlayers(data);

  if (data.grid.locked) {
    throw new Error('Grid is locked');
  }

  // If no initials provided, use registered players
  if (!initialsList || initialsList.length === 0) {
    if (data.players.length > 0) {
      initialsList = data.players.map(p => p.initials);
    } else {
      throw new Error('No participants provided');
    }
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

// --- Player Management ---

// Ensure players array exists on game data (backwards compat)
function ensurePlayers(data) {
  if (!data.players) {
    data.players = [];
  }
  return data;
}

// Generate unique player ID
function generatePlayerId() {
  return `p_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// Derive initials from first + last name, handling conflicts
function deriveInitials(firstName, lastName, existingInitials) {
  const base = (firstName[0] + lastName[0]).toUpperCase();

  if (!existingInitials.includes(base)) {
    return base;
  }

  // Try first letter + first 2 of last name
  const three = (firstName[0] + lastName.slice(0, 2)).toUpperCase();
  if (!existingInitials.includes(three)) {
    return three;
  }

  // Try first 2 of first + first of last
  const alt = (firstName.slice(0, 2) + lastName[0]).toUpperCase();
  if (!existingInitials.includes(alt)) {
    return alt;
  }

  // Append number
  for (let i = 2; i <= 9; i++) {
    const numbered = base + i;
    if (!existingInitials.includes(numbered)) {
      return numbered;
    }
  }

  return base + Math.floor(Math.random() * 100);
}

// Add a player to a game
export function addPlayer(firstName, lastName, gameId) {
  const data = getGameData(gameId);
  ensurePlayers(data);

  if (!firstName || !lastName) {
    throw new Error('First name and last name are required');
  }

  const cleanFirst = firstName.trim();
  const cleanLast = lastName.trim();

  if (cleanFirst.length === 0 || cleanLast.length === 0) {
    throw new Error('First name and last name cannot be empty');
  }

  const existingInitials = data.players.map(p => p.initials);
  const initials = deriveInitials(cleanFirst, cleanLast, existingInitials);

  const player = {
    id: generatePlayerId(),
    firstName: cleanFirst,
    lastName: cleanLast,
    initials,
    createdAt: new Date().toISOString()
  };

  data.players.push(player);
  saveGameData(data);

  return player;
}

// Remove a player from a game (does not clear their squares)
export function removePlayer(playerId, gameId) {
  const data = getGameData(gameId);
  ensurePlayers(data);

  const index = data.players.findIndex(p => p.id === playerId);
  if (index === -1) {
    throw new Error('Player not found');
  }

  const removed = data.players.splice(index, 1)[0];
  saveGameData(data);

  return removed;
}

// Get all players for a game
export function getPlayers(gameId) {
  const data = getGameData(gameId);
  ensurePlayers(data);
  return data.players;
}

// --- Bet Management ---

function ensureBets(data) {
  if (!data.bets) {
    data.bets = [];
  }
  return data;
}

function generateBetId() {
  return `bet_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// Calculate profit from American odds and wager
function calculateBetPayout(odds, wager) {
  if (odds < 0) {
    return wager * (100 / Math.abs(odds));
  } else {
    return wager * (odds / 100);
  }
}

// Place a bet
export function placeBet(gameId, playerId, betData) {
  const data = getGameData(gameId);
  ensureBets(data);

  const player = data.players.find(p => p.id === playerId);
  if (!player) throw new Error('Player not found');

  const { type, description, selection, wager } = betData;
  if (!type || !description || !selection || !wager) {
    throw new Error('Missing required bet fields');
  }
  if (wager <= 0) throw new Error('Wager must be positive');
  if (wager < 0.25) throw new Error('Minimum wager is $0.25');

  const potentialPayout = calculateBetPayout(selection.odds, wager);
  if (potentialPayout > 10.01) {
    throw new Error('Bet exceeds maximum $10 payout');
  }

  const bet = {
    id: generateBetId(),
    playerId,
    playerInitials: player.initials,
    type,
    description,
    selection,
    wager: Math.round(wager * 100) / 100,
    potentialPayout: Math.round(potentialPayout * 100) / 100,
    status: 'pending',
    result: null,
    createdAt: new Date().toISOString(),
    settledAt: null
  };

  data.bets.push(bet);
  saveGameData(data);
  return bet;
}

// Get bets, optionally filtered by player
export function getBets(gameId, playerId = null) {
  const data = getGameData(gameId);
  ensureBets(data);
  if (playerId) {
    return data.bets.filter(b => b.playerId === playerId);
  }
  return data.bets;
}

// Settle a single bet
export function settleBet(gameId, betId, outcome) {
  const data = getGameData(gameId);
  ensureBets(data);

  const bet = data.bets.find(b => b.id === betId);
  if (!bet) throw new Error('Bet not found');
  if (bet.status !== 'pending') throw new Error('Bet already settled');

  bet.status = outcome;
  bet.settledAt = new Date().toISOString();
  bet.result = {
    payout: outcome === 'won' ? bet.potentialPayout : 0
  };

  saveGameData(data);
  return bet;
}

// Get bet statistics for admin dashboard
export function getBetStats(gameId) {
  const data = getGameData(gameId);
  ensureBets(data);

  const bets = data.bets;
  const players = data.players;

  const playerBetStats = {};
  bets.forEach(bet => {
    if (!playerBetStats[bet.playerId]) {
      const player = players.find(p => p.id === bet.playerId);
      playerBetStats[bet.playerId] = {
        playerId: bet.playerId,
        initials: bet.playerInitials,
        name: player ? `${player.firstName} ${player.lastName}` : bet.playerInitials,
        totalWagered: 0,
        totalWon: 0,
        totalLost: 0,
        pendingWagers: 0,
        pendingPotentialPayout: 0,
        betsPlaced: 0,
        betsWon: 0,
        betsLost: 0,
        betsPending: 0
      };
    }
    const ps = playerBetStats[bet.playerId];
    ps.betsPlaced++;
    ps.totalWagered += bet.wager;

    if (bet.status === 'pending') {
      ps.betsPending++;
      ps.pendingWagers += bet.wager;
      ps.pendingPotentialPayout += bet.potentialPayout;
    } else if (bet.status === 'won') {
      ps.betsWon++;
      ps.totalWon += bet.potentialPayout;
    } else if (bet.status === 'lost') {
      ps.betsLost++;
      ps.totalLost += bet.wager;
    }
  });

  const totalPendingLiability = bets
    .filter(b => b.status === 'pending')
    .reduce((sum, b) => sum + b.potentialPayout, 0);

  const houseProfit = bets
    .filter(b => b.status === 'lost')
    .reduce((sum, b) => sum + b.wager, 0)
    - bets
    .filter(b => b.status === 'won')
    .reduce((sum, b) => sum + b.potentialPayout, 0);

  const totalWagered = Math.round(bets.reduce((s, b) => s + b.wager, 0) * 100) / 100;
  const roundedLiability = Math.round(totalPendingLiability * 100) / 100;
  const roundedProfit = Math.round(houseProfit * 100) / 100;

  return {
    players: Object.values(playerBetStats),
    totals: {
      totalBets: bets.length,
      pendingBets: bets.filter(b => b.status === 'pending').length,
      settledBets: bets.filter(b => b.status !== 'pending').length,
      totalWagered,
      totalPendingLiability: roundedLiability,
      houseProfit: roundedProfit
    },
    house: {
      totalWagered,
      pendingLiability: roundedLiability,
      netPosition: roundedProfit
    }
  };
}

// Export for backwards compatibility
export { getGamesIndex, getDefaultGameId } from './gamesService.js';
