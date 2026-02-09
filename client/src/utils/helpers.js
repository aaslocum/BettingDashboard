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

// Evaluate whether a bet's outcome is decided based on current game state.
// Returns { decided: bool, outcome: 'won'|'lost'|'push'|null, reason: string|null }
function evaluateLegOutcome(leg, gameData) {
  const { scores, teams, gameStatus } = gameData;
  const totalScore = scores.home + scores.away;
  const gameOver = gameStatus === 'completed';
  const market = leg.market;
  const outcome = leg.outcome;
  const point = leg.point;

  if (market === 'h2h') {
    // Moneyline: only decidable when game is over
    if (!gameOver) return { decided: false, outcome: null, reason: null };
    const homeWins = scores.home > scores.away;
    const awayWins = scores.away > scores.home;
    const tie = scores.home === scores.away;
    if (tie) return { decided: true, outcome: 'push', reason: 'Game ended in a tie' };
    const betOnHome = outcome === teams.home.name;
    const betOnAway = outcome === teams.away.name;
    if (betOnHome) {
      return { decided: true, outcome: homeWins ? 'won' : 'lost', reason: `${scores.away}-${scores.home} final` };
    }
    if (betOnAway) {
      return { decided: true, outcome: awayWins ? 'won' : 'lost', reason: `${scores.away}-${scores.home} final` };
    }
    // Can't match team name — not decidable
    return { decided: false, outcome: null, reason: null };
  }

  if (market === 'spreads') {
    if (!gameOver) return { decided: false, outcome: null, reason: null };
    // Determine which team this spread is for
    const betOnHome = outcome === teams.home.name;
    const betOnAway = outcome === teams.away.name;
    if (!betOnHome && !betOnAway) return { decided: false, outcome: null, reason: null };
    const teamScore = betOnHome ? scores.home : scores.away;
    const oppScore = betOnHome ? scores.away : scores.home;
    const adjusted = teamScore + point;
    const reason = `${scores.away}-${scores.home} final (${point > 0 ? '+' : ''}${point})`;
    if (adjusted > oppScore) return { decided: true, outcome: 'won', reason };
    if (adjusted < oppScore) return { decided: true, outcome: 'lost', reason };
    return { decided: true, outcome: 'push', reason };
  }

  if (market === 'totals') {
    const isOver = outcome === 'Over';
    const isUnder = outcome === 'Under';
    if (!isOver && !isUnder) return { decided: false, outcome: null, reason: null };

    if (isOver) {
      // Over is won as soon as total exceeds the line (can't go down)
      if (totalScore > point) return { decided: true, outcome: 'won', reason: `Total ${totalScore} > ${point}` };
      if (totalScore === point && gameOver) return { decided: true, outcome: 'push', reason: `Total ${totalScore} = ${point}` };
      if (gameOver) return { decided: true, outcome: 'lost', reason: `Total ${totalScore} < ${point}` };
      return { decided: false, outcome: null, reason: null };
    }

    if (isUnder) {
      // Under is lost as soon as total exceeds the line
      if (totalScore > point) return { decided: true, outcome: 'lost', reason: `Total ${totalScore} > ${point}` };
      if (totalScore === point && gameOver) return { decided: true, outcome: 'push', reason: `Total ${totalScore} = ${point}` };
      if (gameOver) return { decided: true, outcome: 'won', reason: `Total ${totalScore} < ${point}` };
      return { decided: false, outcome: null, reason: null };
    }
  }

  // Player props or unknown markets — can't auto-evaluate
  return { decided: false, outcome: null, reason: null };
}

export function evaluateBetOutcome(bet, gameData) {
  if (!gameData || !gameData.scores || !gameData.teams) {
    return { decided: false, outcome: null, reason: null };
  }

  if (bet.type === 'parlay') {
    if (!bet.legs || bet.legs.length === 0) {
      return { decided: false, outcome: null, reason: null };
    }
    const legResults = bet.legs.map(leg => evaluateLegOutcome(leg, gameData));
    // If any leg is lost, the parlay is lost
    const anyLost = legResults.some(r => r.decided && r.outcome === 'lost');
    if (anyLost) return { decided: true, outcome: 'lost', reason: 'One or more legs lost' };
    // If all legs decided and none lost
    const allDecided = legResults.every(r => r.decided);
    if (!allDecided) return { decided: false, outcome: null, reason: null };
    // All decided: if any push, it's complicated but simplify: all won/push
    const anyPush = legResults.some(r => r.outcome === 'push');
    if (anyPush) return { decided: true, outcome: 'push', reason: 'All legs decided, one or more pushed' };
    return { decided: true, outcome: 'won', reason: 'All legs won' };
  }

  // Straight bet
  if (!bet.selection) return { decided: false, outcome: null, reason: null };
  return evaluateLegOutcome(bet.selection, gameData);
}

// Get a consistent color for a player based on their initials
export function getPlayerColor(initials) {
  if (!initials) return PLAYER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash = initials.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PLAYER_COLORS[Math.abs(hash) % PLAYER_COLORS.length];
}
