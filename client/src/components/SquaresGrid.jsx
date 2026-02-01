import { isWinningSquare } from '../utils/helpers';

function SquaresGrid({ gameData, onSquareClick, displayMode = false }) {
  const { grid, teams, scores } = gameData;
  const { squares, homeNumbers, awayNumbers, locked } = grid;

  const getSquareClass = (index) => {
    const baseClass = displayMode ? 'square text-sm p-1' : 'square text-xs p-0.5';
    const claimed = squares[index] !== null;
    const isWinner = locked && isWinningSquare(index, homeNumbers, awayNumbers, scores.home, scores.away);

    if (isWinner) return `${baseClass} winner`;
    if (claimed) return `${baseClass} claimed`;
    return `${baseClass} bg-gray-600`;
  };

  const truncateName = (name, maxLen = displayMode ? 8 : 6) => {
    if (!name) return '';
    return name.length > maxLen ? name.substring(0, maxLen) : name;
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Grid Header */}
      <div className="text-center mb-2">
        <span className="text-lg font-bold text-yellow-400">
          {teams.home.name}
        </span>
        <span className="text-gray-400 mx-2">vs</span>
        <span className="text-lg font-bold text-yellow-400">
          {teams.away.name}
        </span>
      </div>

      {/* The Grid */}
      <div className="squares-grid bg-gray-900 p-1 rounded-lg">
        {/* Top-left empty corner */}
        <div className="square header bg-gray-800"></div>

        {/* Home team numbers (top row) */}
        {[...Array(10)].map((_, i) => (
          <div key={`home-${i}`} className="square header bg-blue-900">
            {locked ? homeNumbers[i] : '?'}
          </div>
        ))}

        {/* Grid rows with away team numbers */}
        {[...Array(10)].map((_, row) => (
          <>
            {/* Away team number (left column) */}
            <div key={`away-${row}`} className="square header bg-red-900">
              {locked ? awayNumbers[row] : '?'}
            </div>

            {/* Squares in this row */}
            {[...Array(10)].map((_, col) => {
              const index = row * 10 + col;
              return (
                <div
                  key={`square-${index}`}
                  className={getSquareClass(index)}
                  onClick={() => !locked && !squares[index] && onSquareClick?.(index)}
                  title={squares[index] || `Square ${index + 1}`}
                >
                  {truncateName(squares[index])}
                </div>
              );
            })}
          </>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-3 text-sm">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-600 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-700 rounded"></div>
          <span>Claimed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span>Winner</span>
        </div>
      </div>

      {/* Stats */}
      <div className="text-center mt-2 text-gray-400 text-sm">
        {squares.filter(s => s !== null).length} / 100 squares claimed
        {locked && <span className="ml-2 text-green-400">(Grid Locked)</span>}
      </div>
    </div>
  );
}

export default SquaresGrid;
