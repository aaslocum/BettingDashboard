import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const GAMES_DIR = join(__dirname, '../../data/games');
const GAMES_INDEX_FILE = join(__dirname, '../../data/games-index.json');

// Ensure games directory exists
function ensureGamesDir() {
  if (!existsSync(GAMES_DIR)) {
    mkdirSync(GAMES_DIR, { recursive: true });
  }
}

// Default prize distribution (percentages of total pool)
const DEFAULT_PRIZE_DISTRIBUTION = {
  q1: 0.15,  // 15%
  q2: 0.30,  // 30% (Halftime)
  q3: 0.15,  // 15%
  q4: 0.40   // 40% (Final)
};

// Calculate prizes based on bet amount
function calculatePrizes(betAmount) {
  const totalPool = betAmount * 100; // 100 squares
  return {
    q1: Math.round(totalPool * DEFAULT_PRIZE_DISTRIBUTION.q1),
    q2: Math.round(totalPool * DEFAULT_PRIZE_DISTRIBUTION.q2),
    q3: Math.round(totalPool * DEFAULT_PRIZE_DISTRIBUTION.q3),
    q4: Math.round(totalPool * DEFAULT_PRIZE_DISTRIBUTION.q4)
  };
}

// Create default game state with configurable options
function createDefaultGameState(options = {}) {
  const {
    name = 'Super Bowl Party',
    betAmount = 1,
    id = generateGameId()
  } = options;

  const prizes = calculatePrizes(betAmount);

  return {
    id,
    name,
    betAmount,
    totalPool: betAmount * 100,
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
    gameStatus: 'setup',
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
}

// Generate a unique game ID
function generateGameId() {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get games index (list of all games)
export function getGamesIndex() {
  ensureGamesDir();

  if (!existsSync(GAMES_INDEX_FILE)) {
    // Create default game if no games exist
    const defaultGame = createDefaultGameState({ name: 'Default Party' });
    saveGame(defaultGame);
    return getGamesIndex();
  }

  const data = readFileSync(GAMES_INDEX_FILE, 'utf-8');
  return JSON.parse(data);
}

// Save games index
function saveGamesIndex(index) {
  ensureGamesDir();
  writeFileSync(GAMES_INDEX_FILE, JSON.stringify(index, null, 2));
}

// Get game file path
function getGameFilePath(gameId) {
  return join(GAMES_DIR, `${gameId}.json`);
}

// Get a specific game
export function getGame(gameId) {
  ensureGamesDir();
  const filePath = getGameFilePath(gameId);

  if (!existsSync(filePath)) {
    throw new Error(`Game not found: ${gameId}`);
  }

  const data = readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

// Save a game
export function saveGame(gameData) {
  ensureGamesDir();
  gameData.lastUpdated = new Date().toISOString();

  const filePath = getGameFilePath(gameData.id);
  writeFileSync(filePath, JSON.stringify(gameData, null, 2));

  // Update index
  const index = existsSync(GAMES_INDEX_FILE)
    ? JSON.parse(readFileSync(GAMES_INDEX_FILE, 'utf-8'))
    : { games: [], defaultGameId: null };

  const existingIndex = index.games.findIndex(g => g.id === gameData.id);
  const indexEntry = {
    id: gameData.id,
    name: gameData.name,
    betAmount: gameData.betAmount,
    totalPool: gameData.totalPool,
    gameStatus: gameData.gameStatus,
    squaresClaimed: gameData.grid.squares.filter(s => s !== null).length,
    createdAt: gameData.createdAt,
    lastUpdated: gameData.lastUpdated
  };

  if (existingIndex >= 0) {
    index.games[existingIndex] = indexEntry;
  } else {
    index.games.push(indexEntry);
  }

  // Set as default if it's the first game
  if (!index.defaultGameId) {
    index.defaultGameId = gameData.id;
  }

  saveGamesIndex(index);
  return gameData;
}

// Create a new game
export function createGame(options = {}) {
  const { name, betAmount = 1 } = options;

  if (!name || name.trim().length === 0) {
    throw new Error('Game name is required');
  }

  if (betAmount <= 0) {
    throw new Error('Bet amount must be greater than 0');
  }

  const gameData = createDefaultGameState({
    name: name.trim(),
    betAmount: parseFloat(betAmount)
  });

  return saveGame(gameData);
}

// Delete a game
export function deleteGame(gameId) {
  const index = getGamesIndex();

  if (index.games.length <= 1) {
    throw new Error('Cannot delete the last game');
  }

  const gameIndex = index.games.findIndex(g => g.id === gameId);
  if (gameIndex === -1) {
    throw new Error(`Game not found: ${gameId}`);
  }

  // Remove from index
  index.games.splice(gameIndex, 1);

  // Update default if needed
  if (index.defaultGameId === gameId) {
    index.defaultGameId = index.games[0]?.id || null;
  }

  saveGamesIndex(index);

  // Delete file
  const filePath = getGameFilePath(gameId);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }

  return { deleted: gameId, newDefault: index.defaultGameId };
}

// Set default game
export function setDefaultGame(gameId) {
  const index = getGamesIndex();

  const game = index.games.find(g => g.id === gameId);
  if (!game) {
    throw new Error(`Game not found: ${gameId}`);
  }

  index.defaultGameId = gameId;
  saveGamesIndex(index);

  return index;
}

// Get default game ID
export function getDefaultGameId() {
  const index = getGamesIndex();
  return index.defaultGameId;
}

// Update game settings (name, bet amount)
export function updateGameSettings(gameId, settings) {
  const gameData = getGame(gameId);

  if (settings.name !== undefined) {
    gameData.name = settings.name.trim();
  }

  if (settings.betAmount !== undefined) {
    if (gameData.grid.locked) {
      throw new Error('Cannot change bet amount after grid is locked');
    }

    const newBetAmount = parseFloat(settings.betAmount);
    if (newBetAmount <= 0) {
      throw new Error('Bet amount must be greater than 0');
    }

    gameData.betAmount = newBetAmount;
    gameData.totalPool = newBetAmount * 100;

    // Recalculate prizes
    const prizes = calculatePrizes(newBetAmount);
    gameData.quarters.q1.prize = prizes.q1;
    gameData.quarters.q2.prize = prizes.q2;
    gameData.quarters.q3.prize = prizes.q3;
    gameData.quarters.q4.prize = prizes.q4;
  }

  return saveGame(gameData);
}

// Migrate existing game.json to new multi-game structure
export function migrateExistingGame() {
  const oldGameFile = join(__dirname, '../../data/game.json');

  if (!existsSync(oldGameFile)) {
    return null;
  }

  // Check if already migrated
  const index = existsSync(GAMES_INDEX_FILE)
    ? JSON.parse(readFileSync(GAMES_INDEX_FILE, 'utf-8'))
    : null;

  if (index && index.games.length > 0) {
    return null; // Already have games
  }

  // Read old game data
  const oldData = JSON.parse(readFileSync(oldGameFile, 'utf-8'));

  // Create new game from old data
  const newGame = {
    ...createDefaultGameState({ name: 'Migrated Party', betAmount: 1 }),
    ...oldData,
    id: generateGameId(),
    name: 'Super Bowl Party',
    betAmount: 1,
    totalPool: 100
  };

  saveGame(newGame);

  return newGame;
}
