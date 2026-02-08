import { useMemo, useState } from 'react';
import { isWinningSquare } from '../utils/helpers';
import {
  calculateSquareLikelihoods,
  getLikelihoodClass,
  getLikelihoodColor,
  formatScenarioTooltip,
  getLikelihoodLegend,
} from '../utils/squareLikelihood';

function SquaresGrid({
  gameData,
  onSquareClick,
  displayMode = false,
  showLikelihood = true,
  gameContext = {},
  currentPlayerInitials = null
}) {
  const { grid, teams, scores } = gameData;
  const { squares, homeNumbers, awayNumbers, locked } = grid;
  const [hoveredSquare, setHoveredSquare] = useState(null);

  // Calculate likelihoods for all squares
  const likelihoodMap = useMemo(() => {
    if (!locked || !showLikelihood) return null;

    return calculateSquareLikelihoods(scores, {
      ...gameContext,
      homeScore: scores.home,
      awayScore: scores.away,
    });
  }, [scores, locked, showLikelihood, gameContext]);

  // Get the actual grid coordinates from number arrays
  const getGridCoordinates = (homeDigit, awayDigit) => {
    if (!homeNumbers || !awayNumbers) return null;
    const col = homeNumbers.indexOf(homeDigit);
    const row = awayNumbers.indexOf(awayDigit);
    if (col === -1 || row === -1) return null;
    return row * 10 + col;
  };

  const getSquareClass = (index) => {
    const baseClass = displayMode ? 'square text-base p-1' : 'square text-xs p-0.5';
    const claimed = squares[index] !== null;
    const isWinner = locked && isWinningSquare(index, homeNumbers, awayNumbers, scores.home, scores.away);

    if (isWinner) return `${baseClass} winner`;
    if (claimed) {
      // Add likelihood class for claimed squares
      if (locked && showLikelihood && likelihoodMap) {
        const likelihoodData = likelihoodMap.get(index);
        if (likelihoodData && likelihoodData.likelihood > 0 && !likelihoodData.isCurrentWinner) {
          return `${baseClass} claimed ${getLikelihoodClass(likelihoodData.likelihood)}`;
        }
      }
      return `${baseClass} claimed`;
    }

    // Unclaimed squares - show likelihood colors
    if (locked && showLikelihood && likelihoodMap) {
      const likelihoodData = likelihoodMap.get(index);
      if (likelihoodData && likelihoodData.likelihood >= 15) {
        return `${baseClass} ${getLikelihoodClass(likelihoodData.likelihood)} unclaimed-likely`;
      }
    }

    return `${baseClass} bg-gray-600`;
  };

  const getSquareStyle = (index) => {
    if (!locked || !showLikelihood || !likelihoodMap) return {};

    const likelihoodData = likelihoodMap.get(index);
    if (!likelihoodData || likelihoodData.likelihood < 15) return {};

    const isWinner = isWinningSquare(index, homeNumbers, awayNumbers, scores.home, scores.away);
    if (isWinner) return {}; // Winner uses CSS class

    // Use inline style for gradient effect on likely squares
    const color = getLikelihoodColor(likelihoodData.likelihood, likelihoodData.isCurrentWinner);
    const claimed = squares[index] !== null;

    if (claimed) {
      // Semi-transparent overlay for claimed squares
      return {
        background: `linear-gradient(135deg, ${color}40 0%, ${color}20 100%)`,
        borderColor: color,
        borderWidth: '2px',
      };
    }

    return {
      background: `linear-gradient(135deg, ${color}60 0%, ${color}30 100%)`,
    };
  };

  const getTooltipContent = (index) => {
    const playerName = squares[index];
    const isWinner = locked && isWinningSquare(index, homeNumbers, awayNumbers, scores.home, scores.away);

    if (isWinner && playerName) {
      return `🏆 ${playerName} - Current Winner!`;
    }

    if (locked && showLikelihood && likelihoodMap) {
      const likelihoodData = likelihoodMap.get(index);
      if (likelihoodData && likelihoodData.scenarios.length > 0) {
        const scenarioText = formatScenarioTooltip(likelihoodData.scenarios, teams);
        if (playerName) {
          return `${playerName} - ${scenarioText} (${likelihoodData.likelihood}%)`;
        }
        return `${scenarioText} (${likelihoodData.likelihood}%)`;
      }
    }

    if (playerName) {
      return `${playerName} - Square ${index + 1}`;
    }

    return `Square ${index + 1} - Available`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Grid Header - hidden in display mode since page header shows matchup */}
      {!displayMode && (
        <div className="text-center mb-1">
          <span className="text-lg font-bold text-yellow-400">
            {teams.home.name}
          </span>
          <span className="text-gray-400 mx-2">vs</span>
          <span className="text-lg font-bold text-yellow-400">
            {teams.away.name}
          </span>
        </div>
      )}

      {/* Grid with axis labels */}
      <div className="flex items-stretch">
        {/* Away team vertical label (left side of rows) */}
        <div className="flex items-center justify-center flex-shrink-0" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          <span className={`font-bold text-red-400 tracking-widest uppercase whitespace-nowrap ${displayMode ? 'text-xs' : 'text-[10px]'}`}>
            {teams.away.abbreviation || teams.away.name}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Home team horizontal label (above columns) */}
          <div className="flex items-center justify-center gap-1 mb-0.5" style={{ marginLeft: 'calc(100% / 11)' }}>
            <span className="text-[10px] text-gray-500">{'\u2190'}</span>
            <span className={`font-bold text-blue-400 tracking-widest uppercase ${displayMode ? 'text-xs' : 'text-[10px]'}`}>
              {teams.home.abbreviation || teams.home.name}
            </span>
            <span className="text-[10px] text-gray-500">{'\u2192'}</span>
          </div>

          {/* The Grid */}
          <div className="squares-grid bg-gray-900 p-1 rounded-lg">
            {/* Top-left corner cell with axis indicator */}
            <div className="square header bg-gray-800 flex flex-col items-center justify-center !text-[6px] leading-tight font-bold !cursor-default">
              <span className="text-blue-400">{(teams.home.abbreviation || 'H').substring(0, 3)}{'\u2192'}</span>
              <span className="text-red-400">{(teams.away.abbreviation || 'A').substring(0, 3)}{'\u2193'}</span>
            </div>

            {/* Home team numbers (top row) */}
            {[...Array(10)].map((_, i) => (
              <div key={`home-${i}`} className="square header bg-blue-900">
                {locked ? homeNumbers[i] : '?'}
              </div>
            ))}

            {/* Grid rows with away team numbers */}
            {[...Array(10)].map((_, row) => (
              <div key={`row-${row}`} className="contents">
                {/* Away team number (left column) */}
                <div className="square header bg-red-900">
                  {locked ? awayNumbers[row] : '?'}
                </div>

            {/* Squares in this row */}
            {[...Array(10)].map((_, col) => {
              const index = row * 10 + col;
              const isHovered = hoveredSquare === index;
              const likelihoodData = likelihoodMap?.get(index);

              const isCurrentPlayer = currentPlayerInitials && squares[index] === currentPlayerInitials;

              return (
                <div
                  key={`square-${index}`}
                  className={`${getSquareClass(index)} transition-all duration-300 ${isHovered ? 'ring-2 ring-white ring-opacity-50' : ''} ${isCurrentPlayer ? 'ring-2 ring-yellow-400/70' : ''}`}
                  style={getSquareStyle(index)}
                  onClick={() => onSquareClick?.(index)}
                  onMouseEnter={() => setHoveredSquare(index)}
                  onMouseLeave={() => setHoveredSquare(null)}
                  title={getTooltipContent(index)}
                >
                  <span className="relative z-10">
                    {squares[index] || ''}
                  </span>
                  {/* Show likelihood percentage on hover for display mode */}
                  {displayMode && isHovered && likelihoodData?.likelihood > 0 && !likelihoodData?.isCurrentWinner && (
                    <span className="absolute bottom-0 right-0 text-[8px] text-white/70 bg-black/50 px-0.5 rounded">
                      {likelihoodData.likelihood}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
          </div>
        </div>{/* end flex-1 */}
      </div>{/* end flex wrapper */}

      {/* Likelihood Legend - shown when grid is locked */}
      {locked && showLikelihood && !displayMode && (
        <LikelihoodLegend />
      )}

      {/* Simple Legend - shown when grid is not locked or likelihood disabled */}
      {(!locked || !showLikelihood) && !displayMode && (
        <div className="flex justify-center gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-600 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-700 rounded"></div>
            <span>Claimed</span>
          </div>
          {locked && (
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>Winner</span>
            </div>
          )}
        </div>
      )}

      {/* Axis key */}
      {!displayMode && (
        <div className="flex justify-center gap-4 mt-1 text-[10px]">
          <span className="text-blue-400 font-semibold">
            {'\u2190'} {teams.home.abbreviation || teams.home.name} across top {'\u2192'}
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-red-400 font-semibold">
            {'\u2193'} {teams.away.abbreviation || teams.away.name} down left
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="text-center mt-2 text-gray-400 text-sm">
        {squares.filter(s => s !== null).length} / 100 squares claimed
        {locked && <span className="ml-2 text-green-400">(Grid Locked)</span>}
      </div>
    </div>
  );
}

// Likelihood Legend Component
function LikelihoodLegend() {
  const legendItems = getLikelihoodLegend();

  return (
    <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
      <h4 className="text-xs text-gray-400 uppercase tracking-wide mb-2 text-center">
        Next Winner Likelihood
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            <div
              className="w-4 h-4 rounded flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="min-w-0">
              <div className="font-medium text-white truncate">{item.label}</div>
              <div className="text-gray-500 text-[10px] truncate">{item.description}</div>
            </div>
          </div>
        ))}
        {/* Add claimed/unclaimed indicators */}
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-4 rounded flex-shrink-0 bg-green-700" />
          <div className="min-w-0">
            <div className="font-medium text-white">Claimed</div>
            <div className="text-gray-500 text-[10px]">Square taken</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SquaresGrid;
