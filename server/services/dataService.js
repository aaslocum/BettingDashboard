import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE = join(__dirname, '../../data/game.json');

// Initialize default game state
const defaultGameState = {
  teams: {
    home: { name: 'Team A', abbreviation: 'TMA' },
    away: { name: 'Team B', abbreviation: 'TMB' }
  },
  grid: {
    locked: false,
    squares: Array(100).fill(null), // 10x10 grid, null = unclaimed
    homeNumbers: null, // Will be array of 0-9 shuffled
    awayNumbers: null  // Will be array of 0-9 shuffled
  },
  scores: {
    home: 0,
    away: 0
  },
  quarters: {
    q1: { completed: false, winner: null, prize: 15 },
    q2: { completed: false, winner: null, prize: 30 }, // Halftime
    q3: { completed: false, winner: null, prize: 15 },
    q4: { completed: false, winner: null, prize: 40 }  // Final
  },
  gameStatus: 'setup', // setup, active, completed
  lastUpdated: new Date().toISOString()
};

// Ensure data file exists
function ensureDataFile() {
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify(defaultGameState, null, 2));
  }
}

// Read game data
export function getGameData() {
  ensureDataFile();
  const data = readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
}

// Write game data
export function saveGameData(data) {
  data.lastUpdated = new Date().toISOString();
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  return data;
}

// Reset game to default state
export function resetGame() {
  return saveGameData({ ...defaultGameState });
}

// Claim a square
export function claimSquare(index, playerName) {
  const data = getGameData();

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
export function bulkClaimSquares(initialsList) {
  const data = getGameData();

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
export function lockAndRandomize() {
  const data = getGameData();

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
export function updateTeams(homeTeam, awayTeam) {
  const data = getGameData();
  data.teams.home = homeTeam;
  data.teams.away = awayTeam;
  return saveGameData(data);
}

// Update scores
export function updateScores(homeScore, awayScore) {
  const data = getGameData();
  data.scores.home = homeScore;
  data.scores.away = awayScore;
  return saveGameData(data);
}

// Find winner for current scores
export function findWinnerForScores(homeScore, awayScore) {
  const data = getGameData();

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
export function markQuarterWinner(quarter) {
  const data = getGameData();
  const winner = findWinnerForScores(data.scores.home, data.scores.away);

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
export function getPlayerStats() {
  const data = getGameData();
  const { grid, quarters } = data;
  const { squares } = grid;
  const COST_PER_SQUARE = 1;

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
    const betAmount = squareCount * COST_PER_SQUARE;
    const winnings = playerWinnings[initials]?.total || 0;
    const net = winnings - betAmount;

    return {
      initials,
      squareCount,
      betAmount,
      winnings,
      net,
      quarterWins: playerWinnings[initials]?.quarters || []
    };
  });

  // Sort by net descending
  players.sort((a, b) => b.net - a.net || b.squareCount - a.squareCount);

  const totals = {
    totalSquares: squares.filter(s => s !== null).length,
    totalBets: squares.filter(s => s !== null).length * COST_PER_SQUARE,
    totalPaidOut: Object.values(quarters)
      .filter(q => q.completed)
      .reduce((sum, q) => sum + q.prize, 0),
    totalPrizePool: Object.values(quarters).reduce((sum, q) => sum + q.prize, 0)
  };

  return { players, totals };
}
