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
  const { grid, quarters } = gameData;
  const { squares } = grid;
  const COST_PER_SQUARE = 1; // $1 per square

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
    const betAmount = squareCount * COST_PER_SQUARE;
    const winnings = playerWinnings[initials]?.total || 0;
    const net = winnings - betAmount;

    return {
      initials,
      squareCount,
      betAmount,
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
    totalBets: squares.filter(s => s !== null).length * COST_PER_SQUARE,
    totalPaidOut: Object.values(quarters)
      .filter(q => q.completed)
      .reduce((sum, q) => sum + q.prize, 0),
    totalPrizePool: Object.values(quarters).reduce((sum, q) => sum + q.prize, 0)
  };

  return { players: stats, totals };
}
