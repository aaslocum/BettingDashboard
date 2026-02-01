import { formatCurrency, getQuarterName } from '../utils/helpers';

function Scoreboard({ gameData, displayMode = false }) {
  const { teams, scores, quarters, gameStatus } = gameData;

  const sizeClass = displayMode ? 'text-6xl' : 'text-4xl';
  const labelClass = displayMode ? 'text-2xl' : 'text-lg';

  return (
    <div className="card">
      {/* Score Display */}
      <div className="flex justify-center items-center gap-8 mb-6">
        <div className="text-center">
          <div className={`${labelClass} font-bold text-blue-400`}>
            {teams.away.abbreviation || teams.away.name}
          </div>
          <div className={`${sizeClass} font-bold text-white`}>{scores.away}</div>
        </div>

        <div className="text-gray-500 text-2xl">-</div>

        <div className="text-center">
          <div className={`${labelClass} font-bold text-red-400`}>
            {teams.home.abbreviation || teams.home.name}
          </div>
          <div className={`${sizeClass} font-bold text-white`}>{scores.home}</div>
        </div>
      </div>

      {/* Quarter Prizes */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className={`${displayMode ? 'text-xl' : 'text-lg'} font-semibold text-center mb-3 text-yellow-400`}>
          Prize Pool: {formatCurrency(100)}
        </h3>

        <div className="grid grid-cols-4 gap-2">
          {Object.entries(quarters).map(([key, quarter]) => (
            <div
              key={key}
              className={`text-center p-2 rounded ${
                quarter.completed
                  ? 'bg-green-900'
                  : 'bg-gray-700'
              }`}
            >
              <div className={`${displayMode ? 'text-sm' : 'text-xs'} text-gray-400`}>
                {getQuarterName(key)}
              </div>
              <div className={`${displayMode ? 'text-lg' : 'text-sm'} font-bold text-yellow-400`}>
                {formatCurrency(quarter.prize)}
              </div>
              {quarter.completed && quarter.winner && (
                <div className={`${displayMode ? 'text-base' : 'text-xs'} text-green-400 truncate`}>
                  {quarter.winner.player}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Game Status */}
      <div className="text-center mt-4">
        <span className={`inline-block px-3 py-1 rounded-full text-sm ${
          gameStatus === 'setup' ? 'bg-yellow-600' :
          gameStatus === 'active' ? 'bg-green-600' :
          'bg-gray-600'
        }`}>
          {gameStatus === 'setup' ? 'Setting Up' :
           gameStatus === 'active' ? 'Game Active' :
           'Game Completed'}
        </span>
      </div>
    </div>
  );
}

export default Scoreboard;
