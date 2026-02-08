// Format American odds for display
export function formatOdds(price) {
  if (price > 0) return `+${price}`;
  return price.toString();
}

// Get color class based on odds value
export function getOddsColorClass(price) {
  if (price < 0) return 'text-red-400';
  if (price > 0) return 'text-green-400';
  return 'text-gray-400';
}

// Calculate profit from American odds and wager amount
export function calculatePayout(odds, wager) {
  if (odds < 0) {
    return wager * (100 / Math.abs(odds));
  } else {
    return wager * (odds / 100);
  }
}

// Calculate max wager that keeps payout at or below maxPayout
export function calculateMaxWager(odds, maxPayout = 10) {
  if (odds < 0) {
    return Math.floor((maxPayout * Math.abs(odds) / 100) * 100) / 100;
  } else {
    return Math.floor((maxPayout * 100 / odds) * 100) / 100;
  }
}

// --- Parlay Math ---

// Convert American odds to decimal
export function americanToDecimal(odds) {
  if (odds < 0) {
    return 1 + (100 / Math.abs(odds));
  } else {
    return 1 + (odds / 100);
  }
}

// Convert decimal odds to American
export function decimalToAmerican(decimal) {
  if (decimal >= 2) {
    return Math.round((decimal - 1) * 100);
  } else {
    return Math.round(-100 / (decimal - 1));
  }
}

// Calculate combined parlay decimal odds from array of American odds
export function calculateParlayDecimalOdds(americanOddsArray) {
  return americanOddsArray.reduce((acc, odds) => acc * americanToDecimal(odds), 1);
}

// Calculate max wager for parlay given combined decimal odds and max payout
export function calculateParlayMaxWager(combinedDecimalOdds, maxPayout = 100) {
  const profit = combinedDecimalOdds - 1;
  if (profit <= 0) return 0;
  return Math.floor((maxPayout / profit) * 100) / 100;
}

// Calculate grid position from index
export function getGridPosition(index) {
  return {
    row: Math.floor(index / 10),
    col: index % 10
  };
}

// Get index from grid position
export function getGridIndex(row, col) {
  return row * 10 + col;
}

// Format currency
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(amount);
}

// Get quarter display name
export function getQuarterName(quarter) {
  const names = {
    q1: '1st Quarter',
    q2: 'Halftime',
    q3: '3rd Quarter',
    q4: 'Final'
  };
  return names[quarter] || quarter;
}

// Check if a square is a winner for given scores
export function isWinningSquare(index, homeNumbers, awayNumbers, homeScore, awayScore) {
  if (!homeNumbers || !awayNumbers) return false;

  const homeLastDigit = homeScore % 10;
  const awayLastDigit = awayScore % 10;

  const homeCol = homeNumbers.indexOf(homeLastDigit);
  const awayRow = awayNumbers.indexOf(awayLastDigit);

  return index === awayRow * 10 + homeCol;
}

// Calculate player statistics from game data
export function calculatePlayerStats(gameData) {
  const { grid, quarters, betAmount = 1 } = gameData;
  const { squares } = grid;
  const costPerSquare = betAmount;

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

  // Calculate winnings per player from completed quarters
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

  // Combine into player stats
  const allPlayers = new Set([
    ...Object.keys(playerSquares),
    ...Object.keys(playerWinnings)
  ]);

  const stats = Array.from(allPlayers).map(initials => {
    const squareCount = playerSquares[initials]?.count || 0;
    const playerBetAmount = squareCount * costPerSquare;
    const winnings = playerWinnings[initials]?.total || 0;
    const net = winnings - playerBetAmount;

    return {
      initials,
      squareCount,
      betAmount: playerBetAmount,
      winnings,
      net,
      quarterWins: playerWinnings[initials]?.quarters || [],
      squareIndices: playerSquares[initials]?.squares || []
    };
  });

  // Sort by net (highest first), then by squares claimed
  stats.sort((a, b) => {
    if (b.net !== a.net) return b.net - a.net;
    return b.squareCount - a.squareCount;
  });

  // Calculate totals
  const totals = {
    totalSquares: squares.filter(s => s !== null).length,
    totalBets: squares.filter(s => s !== null).length * costPerSquare,
    totalPaidOut: Object.values(quarters)
      .filter(q => q.completed)
      .reduce((sum, q) => sum + q.prize, 0),
    totalPrizePool: Object.values(quarters).reduce((sum, q) => sum + q.prize, 0),
    betAmountPerSquare: costPerSquare
  };

  return { players: stats, totals };
}

// Player color palette for social features
const PLAYER_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#22C55E', // green
  '#F59E0B', // amber
  '#A855F7', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#6366F1', // indigo
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#E11D48', // rose
];

// Get a consistent color for a player based on their initials
export function getPlayerColor(initials) {
  if (!initials) return PLAYER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash = initials.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PLAYER_COLORS[Math.abs(hash) % PLAYER_COLORS.length];
}
