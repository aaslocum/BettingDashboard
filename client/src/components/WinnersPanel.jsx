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
      <h2 className="nbc-section-header mb-0 pb-0 border-0">
        <span className="card-header-accent"></span>
        QUARTER WINNERS
      </h2>

      <div className="space-y-2 mt-3">
        {completedQuarters.map(([key, quarter]) => (
          <div
            key={key}
            className="rounded p-3 flex justify-between items-center"
            style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.3) 0%, rgba(22,101,52,0.2) 100%)' }}
          >
            <div>
              <div className="text-[10px] text-gray-500 font-semibold tracking-wider">
                {getQuarterName(key)}
              </div>
              <div className="text-base font-bold text-white">
                {quarter.winner.player}
              </div>
              <div className="text-xs text-gray-500">
                Score: {quarter.winner.awayScore} - {quarter.winner.homeScore}
              </div>
            </div>
            <div className="text-xl font-bold text-green-400">
              {formatCurrency(quarter.prize)}
            </div>
          </div>
        ))}
      </div>

      {/* Total won */}
      <div className="mt-3 pt-3 flex justify-between items-center" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <span className="text-[10px] text-gray-500 font-semibold tracking-wider">TOTAL AWARDED</span>
        <span className="text-lg font-bold text-green-400">
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
