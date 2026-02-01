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
