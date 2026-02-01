import { formatCurrency, getQuarterName } from '../utils/helpers';

function WinnersPanel({ quarters, displayMode = false }) {
  const completedQuarters = Object.entries(quarters).filter(
    ([_, q]) => q.completed && q.winner
  );

  if (completedQuarters.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <h2 className={`${displayMode ? 'text-2xl' : 'text-xl'} font-bold mb-4 text-yellow-400`}>
        Winners
      </h2>

      <div className="space-y-3">
        {completedQuarters.map(([key, quarter]) => (
          <div
            key={key}
            className="bg-gradient-to-r from-yellow-900 to-green-900 rounded-lg p-4 flex justify-between items-center"
          >
            <div>
              <div className={`${displayMode ? 'text-lg' : 'text-sm'} text-gray-300`}>
                {getQuarterName(key)}
              </div>
              <div className={`${displayMode ? 'text-2xl' : 'text-xl'} font-bold text-white`}>
                {quarter.winner.player}
              </div>
              <div className="text-sm text-gray-400">
                Score: {quarter.winner.awayScore} - {quarter.winner.homeScore}
              </div>
            </div>
            <div className={`${displayMode ? 'text-3xl' : 'text-2xl'} font-bold text-green-400`}>
              {formatCurrency(quarter.prize)}
            </div>
          </div>
        ))}
      </div>

      {/* Total won */}
      <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
        <span className="text-gray-400">Total Awarded</span>
        <span className={`${displayMode ? 'text-2xl' : 'text-xl'} font-bold text-green-400`}>
          {formatCurrency(completedQuarters.reduce((sum, [_, q]) => sum + q.prize, 0))}
        </span>
      </div>
    </div>
  );
}

export default WinnersPanel;
