/**
 * Square Likelihood Calculator
 *
 * Calculates the probability of each square becoming a winner based on
 * current scores and possible scoring scenarios in football.
 */

// Scoring scenarios with base likelihood points
const SCORING_SCENARIOS = [
  { points: 7, likelihood: 70, type: 'td_xp', label: 'TD + XP' },
  { points: 3, likelihood: 50, type: 'fg', label: 'Field Goal' },
  { points: 6, likelihood: 20, type: 'td', label: 'TD (no XP)' },
  { points: 8, likelihood: 20, type: 'td_2pt', label: 'TD + 2PT' },
  { points: 2, likelihood: 5, type: 'safety', label: 'Safety' },
];

// Likelihood thresholds for color coding
export const LIKELIHOOD_THRESHOLDS = {
  CURRENT_WINNER: { min: 100, color: '#FBBF24', label: 'Current Winner', cssClass: 'likelihood-current' },
  VERY_HIGH: { min: 70, color: '#FF8C00', label: 'Very High (TD+XP away)', cssClass: 'likelihood-very-high' },
  HIGH: { min: 50, color: '#FFA500', label: 'High (FG away)', cssClass: 'likelihood-high' },
  MEDIUM: { min: 30, color: '#FFD700', label: 'Medium', cssClass: 'likelihood-medium' },
  LOW: { min: 15, color: '#FFEB99', label: 'Low', cssClass: 'likelihood-low' },
  NONE: { min: 0, color: 'transparent', label: 'Unlikely', cssClass: 'likelihood-none' },
};

/**
 * Get all possible next score digits for a given current digit
 * @param {number} currentDigit - Current last digit of score (0-9)
 * @returns {Array} Array of {newDigit, points, likelihood, type, label}
 */
export function getPossibleNextDigits(currentDigit) {
  const possibilities = [];

  SCORING_SCENARIOS.forEach(scenario => {
    const newScore = currentDigit + scenario.points;
    const newDigit = newScore % 10;

    possibilities.push({
      newDigit,
      points: scenario.points,
      likelihood: scenario.likelihood,
      type: scenario.type,
      label: scenario.label,
    });
  });

  return possibilities;
}

/**
 * Calculate likelihood scores for all 100 squares
 * @param {Object} scores - Current scores {home, away}
 * @param {Object} gameContext - Game context for adjustments
 * @param {Array} homeNumbers - Randomized home number array from grid (index = column, value = digit)
 * @param {Array} awayNumbers - Randomized away number array from grid (index = row, value = digit)
 * @returns {Map} Map of squareIndex -> {likelihood, scenarios}
 */
export function calculateSquareLikelihoods(scores, gameContext = {}, homeNumbers = null, awayNumbers = null) {
  const { home: homeScore = 0, away: awayScore = 0 } = scores;
  const homeDigit = homeScore % 10;
  const awayDigit = awayScore % 10;

  // Map a (homeDigit, awayDigit) pair to the correct grid square index.
  // The grid is randomized: homeNumbers[col] = digit, awayNumbers[row] = digit.
  // We need to find which col/row holds each digit.
  const digitToIndex = (hDigit, aDigit) => {
    if (homeNumbers && awayNumbers) {
      const col = homeNumbers.indexOf(hDigit);
      const row = awayNumbers.indexOf(aDigit);
      if (col === -1 || row === -1) return -1;
      return row * 10 + col;
    }
    // Fallback if number arrays not provided (unlocked grid)
    return aDigit * 10 + hDigit;
  };

  // Get multipliers from game context
  const multipliers = getContextMultipliers(gameContext);

  // Initialize likelihood map for all 100 squares
  const likelihoodMap = new Map();

  for (let i = 0; i < 100; i++) {
    likelihoodMap.set(i, { likelihood: 0, scenarios: [], isCurrentWinner: false });
  }

  // Calculate current winning square
  const currentWinnerIndex = digitToIndex(homeDigit, awayDigit);
  if (currentWinnerIndex >= 0) {
    likelihoodMap.get(currentWinnerIndex).likelihood = 100;
    likelihoodMap.get(currentWinnerIndex).isCurrentWinner = true;
    likelihoodMap.get(currentWinnerIndex).scenarios.push({ label: 'Current Winner', likelihood: 100 });
  }

  // Calculate single-team scoring scenarios
  // Home team scores
  const homePossibilities = getPossibleNextDigits(homeDigit);
  homePossibilities.forEach(poss => {
    const squareIndex = digitToIndex(poss.newDigit, awayDigit);
    if (squareIndex >= 0 && squareIndex !== currentWinnerIndex) {
      const adjustedLikelihood = adjustLikelihood(poss.likelihood, poss.type, multipliers, 'home');
      const existing = likelihoodMap.get(squareIndex);
      existing.likelihood = Math.max(existing.likelihood, adjustedLikelihood);
      existing.scenarios.push({
        team: 'home',
        label: `Home ${poss.label}`,
        likelihood: adjustedLikelihood,
        type: poss.type,
      });
    }
  });

  // Away team scores
  const awayPossibilities = getPossibleNextDigits(awayDigit);
  awayPossibilities.forEach(poss => {
    const squareIndex = digitToIndex(homeDigit, poss.newDigit);
    if (squareIndex >= 0 && squareIndex !== currentWinnerIndex) {
      const adjustedLikelihood = adjustLikelihood(poss.likelihood, poss.type, multipliers, 'away');
      const existing = likelihoodMap.get(squareIndex);
      existing.likelihood = Math.max(existing.likelihood, adjustedLikelihood);
      existing.scenarios.push({
        team: 'away',
        label: `Away ${poss.label}`,
        likelihood: adjustedLikelihood,
        type: poss.type,
      });
    }
  });

  // Calculate double-score scenarios (both teams score) - reduced by 50%
  if (gameContext.includeDoubleScores !== false) {
    homePossibilities.forEach(homePoss => {
      awayPossibilities.forEach(awayPoss => {
        const newHomeDigit = homePoss.newDigit;
        const newAwayDigit = awayPoss.newDigit;
        const squareIndex = digitToIndex(newHomeDigit, newAwayDigit);

        if (squareIndex >= 0 && squareIndex !== currentWinnerIndex) {
          // Combined likelihood, reduced by 50% for being a two-score scenario
          const combinedBase = Math.min(homePoss.likelihood, awayPoss.likelihood) * 0.5;
          const adjustedLikelihood = Math.round(combinedBase * multipliers.overall);

          if (adjustedLikelihood >= 10) { // Only include if meaningful
            const existing = likelihoodMap.get(squareIndex);
            if (adjustedLikelihood > existing.likelihood) {
              existing.likelihood = Math.max(existing.likelihood, adjustedLikelihood);
              existing.scenarios.push({
                team: 'both',
                label: `Both score: Home ${homePoss.label}, Away ${awayPoss.label}`,
                likelihood: adjustedLikelihood,
                type: 'double',
              });
            }
          }
        }
      });
    });
  }

  return likelihoodMap;
}

/**
 * Adjust likelihood based on game context
 */
function adjustLikelihood(baseLikelihood, scoreType, multipliers, team) {
  let adjusted = baseLikelihood;

  // Apply quarter multiplier
  adjusted *= multipliers.quarter;

  // Apply time-based adjustments
  if (scoreType === 'fg') {
    adjusted *= multipliers.fieldGoal;
  } else if (['td_xp', 'td', 'td_2pt'].includes(scoreType)) {
    adjusted *= multipliers.touchdown;
  }

  // Apply team-specific multiplier
  if (team === 'home') {
    adjusted *= multipliers.home;
  } else if (team === 'away') {
    adjusted *= multipliers.away;
  }

  // Apply overall multiplier
  adjusted *= multipliers.overall;

  return Math.round(Math.min(99, adjusted)); // Cap at 99, 100 is reserved for current winner
}

/**
 * Get context-based multipliers from game data
 */
function getContextMultipliers(gameContext) {
  const multipliers = {
    quarter: 1.0,
    fieldGoal: 1.0,
    touchdown: 1.0,
    home: 1.0,
    away: 1.0,
    overall: 1.0,
  };

  if (!gameContext) return multipliers;

  // Quarter adjustments - more scoring in Q2 and Q4
  const quarter = gameContext.quarter || gameContext.period || 1;
  if (quarter === 2 || quarter === 4) {
    multipliers.quarter = 1.2;
  }

  // Time remaining adjustments
  const timeRemaining = gameContext.timeRemaining; // in seconds
  if (timeRemaining !== undefined) {
    // Less than 2 minutes - more FGs, fewer TDs
    if (timeRemaining < 120) {
      multipliers.fieldGoal = 1.3;
      multipliers.touchdown = 0.9;
    }
  }

  // Score differential adjustments
  const homeScore = gameContext.homeScore || 0;
  const awayScore = gameContext.awayScore || 0;
  const differential = homeScore - awayScore;

  // If one team is ahead by 2+ scores (14+ points), they're more likely to score
  if (differential >= 14) {
    multipliers.home = 1.2;
    multipliers.away = 0.9;
  } else if (differential <= -14) {
    multipliers.home = 0.9;
    multipliers.away = 1.2;
  }

  // Live win probability adjustments (if available from odds API)
  if (gameContext.homeWinProbability !== undefined) {
    const homeProb = gameContext.homeWinProbability;
    if (homeProb > 0.7) {
      multipliers.home *= 1.1;
    } else if (homeProb < 0.3) {
      multipliers.away *= 1.1;
    }
  }

  return multipliers;
}

/**
 * Get the CSS class for a given likelihood score
 */
export function getLikelihoodClass(likelihood, isCurrentWinner = false) {
  if (isCurrentWinner || likelihood >= 100) return LIKELIHOOD_THRESHOLDS.CURRENT_WINNER.cssClass;
  if (likelihood >= 70) return LIKELIHOOD_THRESHOLDS.VERY_HIGH.cssClass;
  if (likelihood >= 50) return LIKELIHOOD_THRESHOLDS.HIGH.cssClass;
  if (likelihood >= 30) return LIKELIHOOD_THRESHOLDS.MEDIUM.cssClass;
  if (likelihood >= 15) return LIKELIHOOD_THRESHOLDS.LOW.cssClass;
  return LIKELIHOOD_THRESHOLDS.NONE.cssClass;
}

/**
 * Get the color for a given likelihood score
 */
export function getLikelihoodColor(likelihood, isCurrentWinner = false) {
  if (isCurrentWinner || likelihood >= 100) return LIKELIHOOD_THRESHOLDS.CURRENT_WINNER.color;
  if (likelihood >= 70) return LIKELIHOOD_THRESHOLDS.VERY_HIGH.color;
  if (likelihood >= 50) return LIKELIHOOD_THRESHOLDS.HIGH.color;
  if (likelihood >= 30) return LIKELIHOOD_THRESHOLDS.MEDIUM.color;
  if (likelihood >= 15) return LIKELIHOOD_THRESHOLDS.LOW.color;
  return LIKELIHOOD_THRESHOLDS.NONE.color;
}

/**
 * Format scenario for tooltip display
 */
export function formatScenarioTooltip(scenarios, teams) {
  if (!scenarios || scenarios.length === 0) return null;

  // Get the highest likelihood scenario
  const topScenario = scenarios.reduce((best, current) =>
    current.likelihood > best.likelihood ? current : best
  );

  if (topScenario.isCurrentWinner) {
    return 'Current winning square!';
  }

  const teamName = topScenario.team === 'home'
    ? (teams?.home?.abbreviation || 'Home')
    : topScenario.team === 'away'
      ? (teams?.away?.abbreviation || 'Away')
      : 'Either team';

  // Extract score type
  const scoreLabels = {
    'td_xp': 'TD + XP',
    'fg': 'Field Goal',
    'td': 'Touchdown',
    'td_2pt': 'TD + 2PT',
    'safety': 'Safety',
    'double': 'Both score',
  };

  const scoreType = scoreLabels[topScenario.type] || topScenario.label;

  return `If ${teamName} scores ${scoreType}`;
}

/**
 * Get all likelihood thresholds for legend
 */
export function getLikelihoodLegend() {
  return [
    { ...LIKELIHOOD_THRESHOLDS.CURRENT_WINNER, description: 'Matches current score' },
    { ...LIKELIHOOD_THRESHOLDS.VERY_HIGH, description: 'One TD+XP away' },
    { ...LIKELIHOOD_THRESHOLDS.HIGH, description: 'One field goal away' },
    { ...LIKELIHOOD_THRESHOLDS.MEDIUM, description: 'Less common single score' },
    { ...LIKELIHOOD_THRESHOLDS.LOW, description: 'Multiple scores needed' },
  ];
}
