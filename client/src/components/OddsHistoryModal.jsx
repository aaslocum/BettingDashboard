import { useEffect, useState, useMemo } from 'react';
import { useOddsHistory } from '../hooks/useOddsHistory';
import { formatOdds, getOddsColorClass } from '../utils/helpers';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine
} from 'recharts';

const FIVE_MIN_MS = 5 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

function OddsHistoryModal({ eventId, oddsKey, label, currentOdds, commenceTime, onClose }) {
  const { historyData, loading, error, fetchHistory } = useOddsHistory();
  const [view, setView] = useState('3day'); // '3day' | 'ingame'

  useEffect(() => {
    if (eventId && oddsKey) {
      fetchHistory(eventId, oddsKey);
    }
  }, [eventId, oddsKey, fetchHistory]);

  // Raw data points parsed once
  const rawPoints = useMemo(() => {
    return (historyData?.history || []).map(point => ({
      time: new Date(point.t).getTime(),
      odds: point.v,
    }));
  }, [historyData]);

  // Game start timestamp — if provided, use it; otherwise infer from last 4h of data
  const gameStartMs = useMemo(() => {
    if (commenceTime) return new Date(commenceTime).getTime();
    // Fallback: treat "in-game" as last 4 hours
    return Date.now() - 4 * ONE_HOUR_MS;
  }, [commenceTime]);

  // Normalize raw data into chart points at the selected interval
  const chartData = useMemo(() => {
    if (rawPoints.length < 2) return rawPoints;

    const isInGame = view === 'ingame';
    const intervalMs = isInGame ? FIVE_MIN_MS : ONE_HOUR_MS;

    // Filter to only in-game data when in that view
    const filtered = isInGame
      ? rawPoints.filter(p => p.time >= gameStartMs)
      : rawPoints;

    if (filtered.length < 2) return filtered;

    const floorSlot = (ts) => Math.floor(ts / intervalMs) * intervalMs;

    const firstSlot = floorSlot(filtered[0].time);
    const lastSlot = floorSlot(filtered[filtered.length - 1].time) + intervalMs;
    const points = [];
    let rawIdx = 0;
    let lastOddsValue = filtered[0].odds;

    for (let t = firstSlot; t <= lastSlot; t += intervalMs) {
      while (rawIdx < filtered.length - 1 && filtered[rawIdx + 1].time <= t) {
        rawIdx++;
      }
      if (filtered[rawIdx].time <= t) {
        lastOddsValue = filtered[rawIdx].odds;
      }
      points.push({ time: t, odds: lastOddsValue });
    }

    return points;
  }, [rawPoints, view, gameStartMs]);

  // Stats
  const firstOdds = chartData[0]?.odds;
  const lastOdds = chartData[chartData.length - 1]?.odds;
  const hasData = chartData.length > 1;
  const change = hasData ? lastOdds - firstOdds : 0;
  const trendUp = change > 0;
  const lineColor = change === 0 ? '#60a5fa' : trendUp ? '#4ade80' : '#f87171';

  const timeSpanMs = hasData ? chartData[chartData.length - 1].time - chartData[0].time : 0;
  const timeSpanDays = timeSpanMs / (1000 * 60 * 60 * 24);
  const timeSpanHours = timeSpanMs / ONE_HOUR_MS;
  const isMultiDay = timeSpanDays > 1;
  const isInGame = view === 'ingame';

  // Check if there's actually in-game data available
  const hasInGameData = useMemo(() => {
    return rawPoints.some(p => p.time >= gameStartMs);
  }, [rawPoints, gameStartMs]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label: ts }) => {
    if (!active || !payload?.[0]) return null;
    const d = new Date(ts);
    const dateStr = isInGame
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : isMultiDay
        ? d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
          d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <div style={{
        background: '#0a1628',
        border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: 6,
        padding: '8px 12px',
        fontSize: 12,
      }}>
        <div style={{ color: '#9ca3af', marginBottom: 2 }}>
          {dateStr}
        </div>
        <div style={{ color: lineColor, fontWeight: 700, fontSize: 14 }}>
          {formatOdds(payload[0].value)}
        </div>
      </div>
    );
  };

  // Compute ticks based on view and span
  const ticks = useMemo(() => {
    if (chartData.length < 2) return undefined;
    const min = chartData[0].time;
    const max = chartData[chartData.length - 1].time;
    const hours = (max - min) / ONE_HOUR_MS;

    let tickMinutes;
    if (isInGame) {
      // In-game: tighter ticks
      if (hours <= 1) tickMinutes = 5;
      else if (hours <= 2) tickMinutes = 15;
      else if (hours <= 4) tickMinutes = 30;
      else tickMinutes = 60;
    } else {
      // 3-day: wider ticks
      if (hours <= 12) tickMinutes = 60;
      else if (hours <= 24) tickMinutes = 180;
      else if (hours <= 48) tickMinutes = 360;
      else if (hours <= 96) tickMinutes = 720;
      else tickMinutes = 1440;
    }

    const tickMs = tickMinutes * 60 * 1000;
    const result = [];
    const firstTick = Math.ceil(min / tickMs) * tickMs;
    for (let t = firstTick; t <= max; t += tickMs) {
      result.push(t);
    }
    return result;
  }, [chartData, isInGame]);

  // Tick formatter
  const tickFormatter = (ts) => {
    const d = new Date(ts);
    if (isInGame) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    if (isMultiDay) {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
        d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Span label for footer
  const spanLabel = isInGame
    ? (timeSpanHours < 1
        ? `${Math.round(timeSpanMs / 60000)}min`
        : `${timeSpanHours.toFixed(1)}h`)
    : (timeSpanDays >= 1
        ? `${Math.round(timeSpanDays)} day${Math.round(timeSpanDays) !== 1 ? 's' : ''}`
        : `${Math.round(timeSpanHours)}h`);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '90vh', overflow: 'auto' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-base font-bold tracking-wider uppercase" style={{ color: 'var(--nbc-gold)' }}>
              Odds Movement
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">{label}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-2xl leading-none px-2"
          >
            &times;
          </button>
        </div>

        {/* Current value + trend */}
        <div className="flex items-center gap-4 mb-4 rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <span className="text-sm text-gray-500">Current</span>
          <span className={`text-2xl font-bold ${getOddsColorClass(currentOdds)}`}>
            {formatOdds(currentOdds)}
          </span>
          {hasData && change !== 0 && (
            <span className={`text-sm font-semibold ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
              {trendUp ? '▲' : '▼'} {Math.abs(change)} pts
            </span>
          )}
          {hasData && (
            <span className="text-xs text-gray-600 ml-auto">
              Open: {formatOdds(firstOdds)}
            </span>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 mb-4 p-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <button
            onClick={() => setView('3day')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-bold tracking-wider uppercase transition-all ${
              view === '3day'
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            style={view === '3day' ? {
              background: 'linear-gradient(180deg, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.10) 100%)',
              border: '1px solid rgba(212,175,55,0.3)',
              color: 'var(--nbc-gold)',
            } : { border: '1px solid transparent' }}
          >
            3 Day &middot; Hourly
          </button>
          <button
            onClick={() => setView('ingame')}
            disabled={!hasInGameData && !loading}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-bold tracking-wider uppercase transition-all ${
              view === 'ingame'
                ? 'text-white'
                : hasInGameData || loading
                  ? 'text-gray-500 hover:text-gray-300'
                  : 'text-gray-700 cursor-not-allowed'
            }`}
            style={view === 'ingame' ? {
              background: 'linear-gradient(180deg, rgba(74,222,128,0.20) 0%, rgba(74,222,128,0.08) 100%)',
              border: '1px solid rgba(74,222,128,0.3)',
              color: '#4ade80',
            } : { border: '1px solid transparent' }}
            title={!hasInGameData && !loading ? 'No in-game data available yet' : ''}
          >
            In-Game &middot; 5 min
          </button>
        </div>

        {/* Chart area */}
        {loading && (
          <div className="text-center text-gray-500 py-16 text-sm">Loading history...</div>
        )}
        {error && (
          <div className="text-center text-red-400 py-16 text-sm">{error}</div>
        )}
        {!loading && chartData.length === 0 && (
          <div className="text-center text-gray-600 py-16 text-sm">
            {isInGame ? (
              <>
                No in-game data yet.<br />
                <span className="text-gray-700">Data will appear once the game starts and odds update.</span>
              </>
            ) : (
              <>
                No historical data yet.<br />
                <span className="text-gray-700">Import historical data from the Admin panel or wait for live polling.</span>
              </>
            )}
          </div>
        )}
        {!loading && chartData.length > 0 && (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  ticks={ticks}
                  tickFormatter={tickFormatter}
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
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <Line
                  type="linear"
                  dataKey="odds"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={isInGame && chartData.length <= 60}
                  activeDot={{ r: 5, fill: lineColor, stroke: '#0a1628', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Footer stats */}
        {chartData.length > 0 && (
          <div className="flex justify-between items-center text-[11px] text-gray-600 mt-3 px-1">
            <span>
              {chartData.length} data point{chartData.length !== 1 ? 's' : ''}
              {' '}&middot; {spanLabel}
            </span>
            <span>
              {isInGame ? '5-min intervals' : 'Hourly intervals'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default OddsHistoryModal;
