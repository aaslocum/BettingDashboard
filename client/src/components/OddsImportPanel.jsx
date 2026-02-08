import { useState, useEffect, useRef, useCallback } from 'react';

function OddsImportPanel() {
  const [resolvedEventId, setResolvedEventId] = useState(null);
  const [eventLabel, setEventLabel] = useState(null);
  const [status, setStatus] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [log, setLog] = useState([]);
  const [doneMessage, setDoneMessage] = useState(null);
  const logRef = useRef(null);
  const esRef = useRef(null);

  // Auto-discover event ID from live odds
  useEffect(() => {
    async function discover() {
      try {
        const response = await fetch('/api/odds');
        if (response.ok) {
          const data = await response.json();
          const game = data.games?.[0];
          if (game?.id) {
            setResolvedEventId(game.id);
            setEventLabel(`${game.awayTeam} @ ${game.homeTeam}`);
          }
        }
      } catch (err) { /* silent */ }
    }
    discover();
  }, []);

  // Fetch stored data status
  const fetchStatus = useCallback(async () => {
    if (!resolvedEventId) return;
    try {
      const params = new URLSearchParams({ eventId: resolvedEventId });
      const response = await fetch(`/api/admin/odds-import/status?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        if (data.isImporting) setImporting(true);
      }
    } catch (err) {
      // silent
    }
  }, [resolvedEventId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  // Clean up EventSource on unmount
  useEffect(() => {
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []);

  const startImport = (type = 'all') => {
    if (importing) return;

    setImporting(true);
    setProgress(null);
    setDoneMessage(null);
    setLog([{ time: new Date(), level: 'info', message: `Starting ${type === 'all' ? 'full' : type} import...` }]);

    const params = new URLSearchParams({ eventId: resolvedEventId, type });
    const es = new EventSource(`/api/admin/odds-import?${params}`);
    esRef.current = es;

    es.addEventListener('status', (e) => {
      const data = JSON.parse(e.data);
      setLog(prev => [...prev, { time: new Date(), level: 'info', message: data.message }]);
    });

    es.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data);
      setProgress(data);
    });

    es.addEventListener('log', (e) => {
      const data = JSON.parse(e.data);
      setLog(prev => [...prev, {
        time: new Date(),
        level: data.level,
        message: data.message,
        detail: data.detail,
      }]);
    });

    es.addEventListener('done', (e) => {
      const data = JSON.parse(e.data);
      setDoneMessage(data);
      setImporting(false);
      setProgress(null);
      es.close();
      esRef.current = null;
      fetchStatus();
    });

    es.onerror = () => {
      setLog(prev => [...prev, { time: new Date(), level: 'error', message: 'Connection lost to server' }]);
      setImporting(false);
      setProgress(null);
      es.close();
      esRef.current = null;
      fetchStatus();
    };
  };

  const formatTimeAgo = (isoStr) => {
    if (!isoStr) return 'N/A';
    const diff = Date.now() - new Date(isoStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h ago`;
    if (hours > 0) return `${hours}h ago`;
    const mins = Math.floor(diff / (1000 * 60));
    return `${mins}m ago`;
  };

  const levelColor = {
    info: 'text-gray-400',
    success: 'text-green-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: 'var(--nbc-gold)' }}>
          Historical Odds Import
        </h2>
        {eventLabel && (
          <span className="text-[10px] text-gray-600 font-semibold tracking-wider">{eventLabel}</span>
        )}
      </div>

      {!resolvedEventId && (
        <p className="text-sm text-gray-500">Loading event data...</p>
      )}

      {/* Current Data Summary */}
      {resolvedEventId && status && (
        <div className="rounded p-3 mb-4 space-y-1.5 text-sm" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="flex justify-between">
            <span className="text-gray-500">Stored Lines:</span>
            <span className="text-white font-semibold">{status.totalKeys}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Game odds / Player props</span>
            <span className="text-gray-400">{status.gameOddsKeys} / {status.playerPropsKeys}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Data Points:</span>
            <span className="text-white font-semibold">{status.totalDataPoints.toLocaleString()}</span>
          </div>
          {status.oldestTimestamp && (
            <div className="flex justify-between">
              <span className="text-gray-500">Range:</span>
              <span className="text-gray-300 text-xs">
                {formatTimeAgo(status.oldestTimestamp)} — {formatTimeAgo(status.newestTimestamp)}
              </span>
            </div>
          )}
          {!status.hasApiKey && (
            <div className="text-yellow-500 text-xs mt-2">
              No ODDS_API_KEY configured — import unavailable
            </div>
          )}
        </div>
      )}

      {/* Import Buttons */}
      {resolvedEventId && status?.hasApiKey && !importing && (
        <div className="space-y-2 mb-4">
          <button
            onClick={() => startImport('all')}
            className="w-full py-2.5 rounded font-bold text-sm tracking-wider uppercase transition-all hover:brightness-110"
            style={{
              background: 'linear-gradient(180deg, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.10) 100%)',
              border: '1px solid rgba(212,175,55,0.4)',
              color: 'var(--nbc-gold)',
            }}
          >
            Import All (Game Odds + Props)
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => startImport('game')}
              className="flex-1 py-2 rounded text-xs font-semibold tracking-wider transition-colors text-gray-400 hover:text-white"
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Game Odds Only
            </button>
            <button
              onClick={() => startImport('props')}
              className="flex-1 py-2 rounded text-xs font-semibold tracking-wider transition-colors text-gray-400 hover:text-white"
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Player Props Only
            </button>
          </div>
          <p className="text-[10px] text-gray-600 text-center">
            3 days of hourly data · ~72 API calls per category · Data saved to disk
          </p>
        </div>
      )}

      {/* Progress Bar */}
      {importing && progress && (
        <div className="mb-4">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-gray-400 font-semibold uppercase tracking-wider">
              {progress.phase === 'game_odds' ? 'Game Odds' : 'Player Props'}
            </span>
            <span className="text-gray-500">
              {progress.call}/{progress.totalCalls} calls · {progress.pct}%
            </span>
          </div>
          <div className="w-full rounded-full h-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${progress.pct}%`,
                background: 'linear-gradient(90deg, rgba(212,175,55,0.6), rgba(212,175,55,1))',
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-600 mt-1">
            <span>{progress.pointsAdded} data points</span>
            {progress.remaining && <span>{progress.remaining} API credits left</span>}
          </div>
        </div>
      )}

      {/* Done Badge */}
      {doneMessage && (
        <div className={`text-center text-sm font-semibold py-2 rounded mb-4 ${
          doneMessage.success
            ? 'text-green-400 bg-green-900/20'
            : 'text-red-400 bg-red-900/20'
        }`}>
          {doneMessage.success ? 'Import completed successfully' : `Import failed: ${doneMessage.error}`}
        </div>
      )}

      {/* Log Output */}
      {log.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Import Log</span>
            {!importing && (
              <button
                onClick={() => { setLog([]); setDoneMessage(null); }}
                className="text-[10px] text-gray-600 hover:text-gray-400"
              >
                Clear
              </button>
            )}
          </div>
          <div
            ref={logRef}
            className="rounded text-xs font-mono max-h-[200px] overflow-y-auto p-2 space-y-0.5"
            style={{ background: 'rgba(0,0,0,0.35)' }}
          >
            {log.map((entry, i) => (
              <div key={i} className={levelColor[entry.level] || 'text-gray-400'}>
                <span className="text-gray-700 mr-1.5">
                  {entry.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                {entry.message}
                {entry.detail && (
                  <span className="text-gray-600 ml-1">({entry.detail})</span>
                )}
              </div>
            ))}
            {importing && (
              <div className="text-gray-600 animate-pulse">Importing...</div>
            )}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 rounded text-xs text-blue-300" style={{ background: 'rgba(59,130,246,0.08)' }}>
        <strong>How it works:</strong> Imports 3 days of hourly snapshots from The Odds API historical endpoint.
        Data is saved to disk and served to player charts without additional API calls.
        Live polling continues to add new data points as odds change.
      </div>
    </div>
  );
}

export default OddsImportPanel;
