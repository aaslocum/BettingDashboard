import { useEffect } from 'react';
import { useOddsHistory } from '../hooks/useOddsHistory';
import { formatOdds, getOddsColorClass } from '../utils/helpers';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine
} from 'recharts';

function OddsHistoryModal({ eventId, oddsKey, label, currentOdds, onClose }) {
  const { historyData, loading, error, fetchHistory } = useOddsHistory();

  useEffect(() => {
    if (eventId && oddsKey) {
      fetchHistory(eventId, oddsKey);
    }
  }, [eventId, oddsKey, fetchHistory]);

  // Transform data for recharts
  const chartData = (historyData?.history || []).map(point => ({
    time: new Date(point.t).getTime(),
    odds: point.v,
  }));

  // Trend calculation
  const firstOdds = chartData[0]?.odds;
  const lastOdds = chartData[chartData.length - 1]?.odds;
  const hasData = chartData.length > 1;
  const change = hasData ? lastOdds - firstOdds : 0;
  const trendUp = change > 0;
  const lineColor = change === 0 ? '#60a5fa' : trendUp ? '#4ade80' : '#f87171';

  // Determine time span for smart axis formatting
  const timeSpanMs = hasData ? chartData[chartData.length - 1].time - chartData[0].time : 0;
  const timeSpanDays = timeSpanMs / (1000 * 60 * 60 * 24);
  const isMultiDay = timeSpanDays > 1;

  // Custom tooltip — shows full date+time for multi-day, just time for intraday
  const CustomTooltip = ({ active, payload, label: ts }) => {
    if (!active || !payload?.[0]) return null;
    const d = new Date(ts);
    const dateStr = isMultiDay
      ? d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return (
      <div style={{
        background: '#0a1628',
        border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: 4,
        padding: '6px 10px',
        fontSize: 12,
      }}>
        <div style={{ color: '#9ca3af', marginBottom: 2 }}>
          {dateStr}
        </div>
        <div style={{ color: lineColor, fontWeight: 700 }}>
          {formatOdds(payload[0].value)}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: 'var(--nbc-gold)' }}>
              Odds Movement
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xl leading-none px-1"
          >
            &times;
          </button>
        </div>

        {/* Current value + trend */}
        <div className="flex items-center gap-3 mb-3 rounded p-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <span className="text-xs text-gray-500">Current</span>
          <span className={`text-xl font-bold ${getOddsColorClass(currentOdds)}`}>
            {formatOdds(currentOdds)}
          </span>
          {hasData && change !== 0 && (
            <span className={`text-xs font-semibold ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
              {trendUp ? '▲' : '▼'} {Math.abs(change)} pts
            </span>
          )}
        </div>

        {/* Chart area */}
        {loading && (
          <div className="text-center text-gray-500 py-10 text-sm">Loading history...</div>
        )}
        {error && (
          <div className="text-center text-red-400 py-10 text-sm">{error}</div>
        )}
        {!loading && chartData.length === 0 && (
          <div className="text-center text-gray-600 py-10 text-sm">
            No historical data yet.<br />
            <span className="text-gray-700">Check back after a few minutes.</span>
          </div>
        )}
        {!loading && chartData.length > 0 && (
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(ts) => {
                    const d = new Date(ts);
                    if (isMultiDay) {
                      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    }
                    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  }}
                  tick={{ fill: '#4b5563', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tickFormatter={formatOdds}
                  tick={{ fill: '#4b5563', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <Line
                  type="linear"
                  dataKey="odds"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: lineColor, stroke: '#0a1628', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Footer */}
        {chartData.length > 0 && (
          <div className="text-[10px] text-gray-600 text-center mt-2">
            {chartData.length} data point{chartData.length !== 1 ? 's' : ''}
            {isMultiDay && (
              <span> &middot; {Math.round(timeSpanDays)} day{Math.round(timeSpanDays) !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default OddsHistoryModal;
