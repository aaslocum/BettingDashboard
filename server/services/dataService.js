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
