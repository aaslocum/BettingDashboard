import { formatCurrency, getQuarterName } from '../utils/helpers';

function WinnersPanel({ quarters, displayMode = false }) {
  const quarterEntries = Object.entries(quarters);

  if (displayMode) {
    return <WinnersPanelNBC quarters={quarters} />;
  }

  const completedQuarters = quarterEntries.filter(([_, q]) => q.completed && q.winner);

  if (completedQuarters.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4 text-yellow-400">
        Winners
      </h2>

      <div className="space-y-3">
        {completedQuarters.map(([key, quarter]) => (
          <div
            key={key}
            className="bg-gradient-to-r from-yellow-900 to-green-900 rounded-lg p-4 flex justify-between items-center"
          >
            <div>
              <div className="text-sm text-gray-300">
                {getQuarterName(key)}
              </div>
              <div className="text-xl font-bold text-white">
                {quarter.winner.player}
              </div>
              <div className="text-sm text-gray-400">
                Score: {quarter.winner.awayScore} - {quarter.winner.homeScore}
              </div>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(quarter.prize)}
            </div>
          </div>
        ))}
      </div>

      {/* Total won */}
      <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
        <span className="text-gray-400">Total Awarded</span>
        <span className="text-xl font-bold text-green-400">
          {formatCurrency(completedQuarters.reduce((sum, [_, q]) => sum + q.prize, 0))}
        </span>
      </div>
    </div>
  );
}

function WinnersPanelNBC({ quarters }) {
  const quarterOrder = ['q1', 'q2', 'q3', 'q4'];
  const quarterLabels = {
    q1: 'Q1',
    q2: 'HALF',
    q3: 'Q3',
    q4: 'FINAL'
  };

  return (
    <div className="nbc-panel">
      <div className="nbc-panel-header">
        <span className="nbc-header-accent"></span>
        <h3 className="nbc-panel-title">QUARTER WINNERS</h3>
      </div>

      <div className="p-2">
        {quarterOrder.map((key) => {
          const quarter = quarters[key];
          const isCompleted = quarter.completed && quarter.winner;

          return (
            <div
              key={key}
              className={`nbc-quarter-row ${isCompleted ? 'bg-black/20' : ''}`}
            >
              <span className="nbc-quarter-label">{quarterLabels[key]}</span>
              <span className={`nbc-quarter-winner ${!isCompleted ? 'text-gray-600' : ''}`}>
                {isCompleted ? quarter.winner.player : '---'}
              </span>
              <span className={`nbc-quarter-prize ${!isCompleted ? 'text-gray-600' : ''}`}>
                {formatCurrency(quarter.prize)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WinnersPanel;
