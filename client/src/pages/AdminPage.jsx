import { useState, useEffect, useCallback } from 'react';
import { useGameData } from '../hooks/useGameData';
import { useGameContext } from '../context/GameContext';
import SquaresGrid from '../components/SquaresGrid';
import PlayerStats from '../components/PlayerStats';
import BulkAssignModal from '../components/BulkAssignModal';
import GameSelector from '../components/GameSelector';
import BetsAdmin from '../components/BetsAdmin';
import { getQuarterName, formatCurrency } from '../utils/helpers';

function AdminPage() {
  const { currentGameId, currentGame, deleteGame, updateGame, games } = useGameContext();
  const { gameData, loading, error, refetch, addPlayer, removePlayer } = useGameData(5000, currentGameId);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [syncStatus, setSyncStatus] = useState(null);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);

  // Fetch sync status
  const fetchSyncStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/sync/status');
      const data = await response.json();
      setSyncStatus(data);
    } catch (err) {
      console.error('Failed to fetch sync status:', err);
    }
  }, []);

  useEffect(() => {
    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchSyncStatus]);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const apiCall = async (endpoint, body) => {
    try {
      const response = await fetch(`/api/admin/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, gameId: currentGameId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      refetch();
      return data;
    } catch (err) {
      throw err;
    }
  };

  if (loading) {
    return <div className="text-center text-xl text-gray-400">Loading...</div>;
  }

  if (error) {
    return <div className="card text-red-400">Error: {error}</div>;
  }

  if (!gameData) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-extrabold text-center tracking-wider uppercase" style={{ color: 'var(--nbc-gold)' }}>
        Admin Controls
      </h1>
      {gameData && (
        <p className="text-center text-xs sm:text-sm text-gray-500 tracking-wide">
          Managing: <span className="text-white font-semibold">{gameData.name}</span>
          {' · '}{formatCurrency(gameData.betAmount)}/square · {formatCurrency(gameData.totalPool)} pool
        </p>
      )}

      {message.text && (
        <div className={`card text-center ${
          message.type === 'error' ? 'bg-red-900' : 'bg-green-900'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Controls */}
        <div className="space-y-4">
          {/* Game Management */}
          <GameSettingsControl
            gameData={gameData}
            games={games}
            onUpdate={async (settings) => {
              try {
                await updateGame(currentGameId, settings);
                refetch();
                showMessage('Game settings updated');
              } catch (err) {
                showMessage(err.message, 'error');
              }
            }}
            onDelete={async () => {
              if (confirm('Are you sure you want to delete this party? This cannot be undone.')) {
                try {
                  await deleteGame(currentGameId);
                  showMessage('Party deleted');
                } catch (err) {
                  showMessage(err.message, 'error');
                }
              }
            }}
          />

          {/* Player Management */}
          <PlayersControl
            players={gameData.players || []}
            squares={gameData.grid.squares}
            onAddPlayer={async (firstName, lastName) => {
              try {
                await addPlayer(firstName, lastName);
                showMessage(`Added ${firstName} ${lastName}`);
              } catch (err) {
                showMessage(err.message, 'error');
              }
            }}
            onRemovePlayer={async (playerId, playerName) => {
              if (confirm(`Remove ${playerName} from the game? Their squares will NOT be cleared.`)) {
                try {
                  await removePlayer(playerId);
                  showMessage(`Removed ${playerName}`);
                } catch (err) {
                  showMessage(err.message, 'error');
                }
              }
            }}
          />

          {/* Auto-Sync Control - Primary control for hands-off operation */}
          <AutoSyncControl
            syncStatus={syncStatus}
            onToggle={async (enable) => {
              try {
                const endpoint = enable ? 'sync/start' : 'sync/stop';
                await apiCall(endpoint, {});
                fetchSyncStatus();
                showMessage(enable ? 'Auto-sync started' : 'Auto-sync stopped');
              } catch (err) {
                showMessage(err.message, 'error');
              }
            }}
            onSyncNow={async () => {
              try {
                await apiCall('sync/now', {});
                fetchSyncStatus();
                showMessage('Manual sync completed');
              } catch (err) {
                showMessage(err.message, 'error');
              }
            }}
            teams={gameData.teams}
            scores={gameData.scores}
          />

          {/* Grid Lock */}
          <GridControl
            locked={gameData.grid.locked}
            squaresClaimed={gameData.grid.squares.filter(s => s !== null).length}
            onLock={async () => {
              try {
                await apiCall('lock', {});
                showMessage('Grid locked and numbers randomized');
              } catch (err) {
                showMessage(err.message, 'error');
              }
            }}
            onBulkAssign={() => setShowBulkAssignModal(true)}
          />

          {/* Quarter Controls */}
          <QuarterControl
            quarters={gameData.quarters}
            scores={gameData.scores}
            gridLocked={gameData.grid.locked}
            onMarkQuarter={async (quarter) => {
              await apiCall('quarter', { quarter });
              showMessage(`${getQuarterName(quarter)} winner recorded`);
            }}
          />

          {/* Betting Ledger */}
          <BetsAdmin gameId={currentGameId} />

          {/* Demo Score Controls */}
          <DemoScoreControl
            teams={gameData.teams}
            scores={gameData.scores}
            gridLocked={gameData.grid.locked}
            onUpdateScores={async (newScores) => {
              try {
                await apiCall('scores', {
                  homeScore: newScores.home,
                  awayScore: newScores.away
                });
              } catch (err) {
                showMessage(err.message, 'error');
              }
            }}
          />

          {/* Reset Game */}
          <ResetControl
            onReset={async () => {
              if (confirm('Are you sure you want to reset the entire game?')) {
                await apiCall('reset', {});
                showMessage('Game reset');
              }
            }}
          />
        </div>

        {/* Right Column - Grid Preview & Stats */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: 'var(--nbc-gold)' }}>Grid Preview</h2>
              {gameData.grid.locked && (
                <span className="text-sm text-gray-400">
                  Showing likelihood colors
                </span>
              )}
            </div>
            <SquaresGrid
              gameData={gameData}
              showLikelihood={gameData.grid.locked}
              gameContext={buildGameContext(gameData)}
            />
          </div>

          {/* Player Stats with Collection/Payout Info */}
          <PlayerStats gameData={gameData} showCollectionInfo={true} />
        </div>
      </div>

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <BulkAssignModal
          remainingSquares={100 - gameData.grid.squares.filter(s => s !== null).length}
          players={gameData.players || []}
          onAssign={async (initialsList) => {
            const response = await fetch('/api/game/bulk-claim', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initialsList, gameId: currentGameId })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            refetch();
            showMessage(`Assigned ${data.totalAssigned} squares to ${data.participants} participants`);
          }}
          onClose={() => setShowBulkAssignModal(false)}
        />
      )}
    </div>
  );
}

const DEFAULT_DISTRIBUTION = { q1: 0.15, q2: 0.30, q3: 0.15, q4: 0.40 };

function GameSettingsControl({ gameData, games, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(gameData?.name || '');
  const [betAmount, setBetAmount] = useState(gameData?.betAmount || 1);
  const [distribution, setDistribution] = useState(() => {
    const d = gameData?.prizeDistribution || DEFAULT_DISTRIBUTION;
    return { q1: d.q1 * 100, q2: d.q2 * 100, q3: d.q3 * 100, q4: d.q4 * 100 };
  });

  useEffect(() => {
    setName(gameData?.name || '');
    setBetAmount(gameData?.betAmount || 1);
    const d = gameData?.prizeDistribution || DEFAULT_DISTRIBUTION;
    setDistribution({ q1: d.q1 * 100, q2: d.q2 * 100, q3: d.q3 * 100, q4: d.q4 * 100 });
  }, [gameData]);

  const distributionTotal = distribution.q1 + distribution.q2 + distribution.q3 + distribution.q4;
  const isValidDistribution = Math.abs(distributionTotal - 100) < 0.01;

  const handleDistributionChange = (quarter, value) => {
    const numValue = Math.max(0, Math.min(100, parseFloat(value) || 0));
    setDistribution(prev => ({ ...prev, [quarter]: numValue }));
  };

  const handleSave = async () => {
    const updates = { name, betAmount };
    if (!gameData?.grid?.locked) {
      updates.prizeDistribution = {
        q1: distribution.q1 / 100,
        q2: distribution.q2 / 100,
        q3: distribution.q3 / 100,
        q4: distribution.q4 / 100
      };
    }
    await onUpdate(updates);
    setIsEditing(false);
  };

  const canDelete = games.length > 1;
  const canEditFinancials = !gameData?.grid?.locked;
  const totalPool = (gameData?.betAmount || 1) * 100;

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: 'var(--nbc-gold)' }}>Party Settings</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Party Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Cost Per Square
              {!canEditFinancials && (
                <span className="text-yellow-500 ml-2">(locked)</span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">$</span>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
                disabled={!canEditFinancials}
                min="0.01"
                step="0.01"
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white disabled:opacity-50"
              />
            </div>
          </div>

          {/* Prize Distribution */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Prize Distribution
              {!canEditFinancials && (
                <span className="text-yellow-500 ml-2">(locked)</span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'q1', label: 'Q1' },
                { key: 'q2', label: 'Halftime' },
                { key: 'q3', label: 'Q3' },
                { key: 'q4', label: 'Final' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 w-16">{label}</label>
                  <input
                    type="number"
                    value={distribution[key]}
                    onChange={(e) => handleDistributionChange(key, e.target.value)}
                    disabled={!canEditFinancials}
                    min="0"
                    max="100"
                    step="1"
                    className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm disabled:opacity-50"
                  />
                  <span className="text-gray-500 text-xs">%</span>
                </div>
              ))}
            </div>
            <div className={`mt-2 text-xs text-center py-1 rounded ${
              isValidDistribution ? 'text-green-400' : 'text-red-400 bg-red-900/30'
            }`}>
              Total: {distributionTotal}% {!isValidDistribution && '(must equal 100%)'}
            </div>
            {!canEditFinancials && (
              <p className="text-xs text-yellow-500 mt-1">
                Cannot change after grid is locked
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!isValidDistribution}
              className="btn-success flex-1 disabled:opacity-50"
            >
              Save
            </button>
            <button onClick={() => setIsEditing(false)} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Party Name:</span>
            <span className="text-white font-semibold">{gameData?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Cost Per Square:</span>
            <span className="text-white">{formatCurrency(gameData?.betAmount || 1)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total Pool:</span>
            <span className="text-green-400 font-semibold">{formatCurrency(gameData?.totalPool || 100)}</span>
          </div>
          <div className="pt-2 mt-2 border-t border-gray-700">
            <div className="text-gray-400 mb-1">Prize Distribution:</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Q1:</span>
                <span className="text-white">{formatCurrency(gameData?.quarters?.q1?.prize || totalPool * 0.15)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Half:</span>
                <span className="text-white">{formatCurrency(gameData?.quarters?.q2?.prize || totalPool * 0.30)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Q3:</span>
                <span className="text-white">{formatCurrency(gameData?.quarters?.q3?.prize || totalPool * 0.15)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Final:</span>
                <span className="text-white">{formatCurrency(gameData?.quarters?.q4?.prize || totalPool * 0.40)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {canDelete && !isEditing && (
        <button
          onClick={onDelete}
          className="w-full mt-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
        >
          Delete This Party
        </button>
      )}
    </div>
  );
}

function AutoSyncControl({ syncStatus, onToggle, onSyncNow, teams, scores }) {
  const isEnabled = syncStatus?.enabled || false;
  const lastSync = syncStatus?.lastSync;
  const lastError = syncStatus?.lastError;
  const useMockData = syncStatus?.useMockData;

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: 'var(--nbc-gold)' }}>Live Score Sync</h2>
        <span className={`px-2 py-1 rounded text-sm ${
          isEnabled ? 'bg-green-600' : 'bg-gray-600'
        }`}>
          {isEnabled ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Current Status Display */}
      <div className="bg-gray-700 rounded-lg p-4 mb-4">
        <div className="text-center mb-3">
          <div className="text-sm text-gray-400 mb-1">Current Score</div>
          <div className="text-3xl font-bold">
            <span className="text-blue-400">{teams.away.abbreviation}</span>
            <span className="mx-2">{scores.away}</span>
            <span className="text-gray-500">-</span>
            <span className="mx-2">{scores.home}</span>
            <span className="text-red-400">{teams.home.abbreviation}</span>
          </div>
        </div>
        <div className="text-center text-sm text-gray-400">
          {teams.away.name} @ {teams.home.name}
        </div>
      </div>

      {/* Sync Controls */}
      <div className="space-y-3">
        <button
          onClick={() => onToggle(!isEnabled)}
          className={`w-full py-3 rounded font-bold transition-colors ${
            isEnabled
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isEnabled ? 'Stop Auto-Sync' : 'Start Auto-Sync'}
        </button>

        <button
          onClick={onSyncNow}
          className="btn-secondary w-full"
        >
          Sync Now
        </button>
      </div>

      {/* Status Info */}
      <div className="mt-4 pt-4 border-t border-gray-700 text-sm">
        {useMockData && (
          <div className="text-yellow-500 mb-2">
            Using simulated data (no API key configured)
          </div>
        )}
        {lastSync && (
          <div className="text-gray-400">
            Last sync: {new Date(lastSync).toLocaleTimeString()}
          </div>
        )}
        {lastError && (
          <div className="text-red-400">
            Error: {lastError}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-900/30 rounded text-sm text-blue-300">
        <strong>Hands-off mode:</strong> When enabled, team names and scores
        update automatically from live data every 10 seconds. You only need
        to mark quarter winners.
      </div>
    </div>
  );
}

function GridControl({ locked, squaresClaimed, onLock, onBulkAssign }) {
  const remainingSquares = 100 - squaresClaimed;

  return (
    <div className="card">
      <h2 className="text-sm font-bold tracking-wider uppercase mb-4" style={{ color: 'var(--nbc-gold)' }}>Grid Control</h2>
      <div className="mb-4">
        <div className="flex justify-between text-sm">
          <span>Squares claimed:</span>
          <span className={squaresClaimed === 100 ? 'text-green-400' : 'text-yellow-400'}>
            {squaresClaimed} / 100
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all"
            style={{ width: `${squaresClaimed}%` }}
          />
        </div>
      </div>
      {locked ? (
        <div className="text-center text-green-400 font-semibold">
          Grid is locked - Numbers randomized
        </div>
      ) : squaresClaimed < 100 ? (
        <button
          onClick={onBulkAssign}
          className="btn-primary w-full"
        >
          Need {remainingSquares} more squares - Click to bulk assign
        </button>
      ) : (
        <button
          onClick={onLock}
          className="btn-success w-full"
        >
          Lock Grid & Randomize Numbers
        </button>
      )}
    </div>
  );
}

function QuarterControl({ quarters, scores, gridLocked, onMarkQuarter }) {
  if (!gridLocked) {
    return (
      <div className="card">
        <h2 className="text-sm font-bold tracking-wider uppercase mb-4" style={{ color: 'var(--nbc-gold)' }}>Quarter Payouts</h2>
        <p className="text-gray-400">Lock the grid first to enable quarter payouts</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-sm font-bold tracking-wider uppercase mb-4" style={{ color: 'var(--nbc-gold)' }}>Quarter Payouts</h2>
      <p className="text-sm text-gray-400 mb-4">
        Current score: {scores.away} - {scores.home} (Last digits: {scores.away % 10} - {scores.home % 10})
      </p>
      <div className="space-y-2">
        {Object.entries(quarters).map(([key, quarter]) => (
          <div key={key} className="flex justify-between items-center">
            <span>{getQuarterName(key)} ({formatCurrency(quarter.prize)})</span>
            {quarter.completed ? (
              <span className="text-green-400">
                Winner: {quarter.winner?.player}
              </span>
            ) : (
              <button
                onClick={() => onMarkQuarter(key)}
                className="btn-primary text-sm"
              >
                Mark Winner
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResetControl({ onReset }) {
  return (
    <div className="card">
      <h2 className="text-sm font-bold tracking-wider uppercase mb-4 text-red-400">Danger Zone</h2>
      <button onClick={onReset} className="btn-danger w-full">
        Reset Entire Game
      </button>
    </div>
  );
}

function DemoScoreControl({ teams, scores, onUpdateScores, gridLocked }) {
  const [localScores, setLocalScores] = useState({
    home: scores.home,
    away: scores.away
  });

  // Sync local state when external scores change
  useEffect(() => {
    setLocalScores({ home: scores.home, away: scores.away });
  }, [scores.home, scores.away]);

  const handleIncrement = async (team, amount) => {
    const newScores = {
      ...localScores,
      [team]: Math.max(0, localScores[team] + amount)
    };
    setLocalScores(newScores);
    await onUpdateScores(newScores);
  };

  const handleSetScore = async (team, value) => {
    const newScores = {
      ...localScores,
      [team]: Math.max(0, parseInt(value) || 0)
    };
    setLocalScores(newScores);
  };

  const handleApplyScores = async () => {
    await onUpdateScores(localScores);
  };

  // Common score increments in football
  const scoreButtons = [
    { label: '+7', amount: 7, color: 'bg-green-600 hover:bg-green-700' },
    { label: '+3', amount: 3, color: 'bg-blue-600 hover:bg-blue-700' },
    { label: '+6', amount: 6, color: 'bg-yellow-600 hover:bg-yellow-700' },
    { label: '+2', amount: 2, color: 'bg-purple-600 hover:bg-purple-700' },
    { label: '+1', amount: 1, color: 'bg-gray-600 hover:bg-gray-700' },
  ];

  return (
    <div className="card" style={{ borderColor: 'rgba(212, 175, 55, 0.4)' }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: 'var(--nbc-gold)' }}>Demo Score Controls</h2>
        <span className="px-2 py-1 rounded text-sm bg-yellow-600">
          Testing Mode
        </span>
      </div>

      {!gridLocked && (
        <div className="mb-4 p-3 bg-yellow-900/30 rounded text-sm text-yellow-300">
          Lock the grid first to see likelihood colors update as you change scores.
        </div>
      )}

      {/* Away Team */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold text-blue-400">{teams.away.abbreviation}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleIncrement('away', -1)}
              className="w-8 h-8 rounded bg-red-600 hover:bg-red-700 font-bold"
            >
              -
            </button>
            <input
              type="number"
              value={localScores.away}
              onChange={(e) => handleSetScore('away', e.target.value)}
              onBlur={handleApplyScores}
              className="w-16 text-center bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xl font-bold"
              min="0"
            />
            <button
              onClick={() => handleIncrement('away', 1)}
              className="w-8 h-8 rounded bg-green-600 hover:bg-green-700 font-bold"
            >
              +
            </button>
          </div>
        </div>
        <div className="flex gap-1 flex-wrap">
          {scoreButtons.map(btn => (
            <button
              key={`away-${btn.amount}`}
              onClick={() => handleIncrement('away', btn.amount)}
              className={`px-3 py-1 rounded text-sm font-semibold ${btn.color}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Home Team */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold text-red-400">{teams.home.abbreviation}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleIncrement('home', -1)}
              className="w-8 h-8 rounded bg-red-600 hover:bg-red-700 font-bold"
            >
              -
            </button>
            <input
              type="number"
              value={localScores.home}
              onChange={(e) => handleSetScore('home', e.target.value)}
              onBlur={handleApplyScores}
              className="w-16 text-center bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xl font-bold"
              min="0"
            />
            <button
              onClick={() => handleIncrement('home', 1)}
              className="w-8 h-8 rounded bg-green-600 hover:bg-green-700 font-bold"
            >
              +
            </button>
          </div>
        </div>
        <div className="flex gap-1 flex-wrap">
          {scoreButtons.map(btn => (
            <button
              key={`home-${btn.amount}`}
              onClick={() => handleIncrement('home', btn.amount)}
              className={`px-3 py-1 rounded text-sm font-semibold ${btn.color}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Score Presets */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-sm text-gray-400 mb-2">Quick Presets:</div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onUpdateScores({ away: 0, home: 0 })}
            className="px-3 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600"
          >
            0-0
          </button>
          <button
            onClick={() => onUpdateScores({ away: 7, home: 3 })}
            className="px-3 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600"
          >
            7-3
          </button>
          <button
            onClick={() => onUpdateScores({ away: 14, home: 10 })}
            className="px-3 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600"
          >
            14-10
          </button>
          <button
            onClick={() => onUpdateScores({ away: 21, home: 17 })}
            className="px-3 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600"
          >
            21-17
          </button>
          <button
            onClick={() => onUpdateScores({ away: 24, home: 21 })}
            className="px-3 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600"
          >
            24-21
          </button>
          <button
            onClick={() => onUpdateScores({ away: 31, home: 28 })}
            className="px-3 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600"
          >
            31-28
          </button>
        </div>
      </div>

      {/* Current Last Digits */}
      <div className="mt-4 p-3 bg-gray-700/50 rounded">
        <div className="text-sm text-gray-400 mb-1">Current Last Digits (for squares):</div>
        <div className="text-2xl font-bold text-center">
          <span className="text-blue-400">{localScores.away % 10}</span>
          <span className="text-gray-500 mx-2">-</span>
          <span className="text-red-400">{localScores.home % 10}</span>
        </div>
      </div>
    </div>
  );
}

function PlayersControl({ players, squares, onAddPlayer, onRemovePlayer }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setAdding(true);
    try {
      await onAddPlayer(firstName.trim(), lastName.trim());
      setFirstName('');
      setLastName('');
    } finally {
      setAdding(false);
    }
  };

  // Count squares per player initials
  const squareCounts = {};
  squares.forEach(s => {
    if (s) squareCounts[s] = (squareCounts[s] || 0) + 1;
  });

  return (
    <div className="card">
      <h2 className="text-sm font-bold tracking-wider uppercase mb-4" style={{ color: 'var(--nbc-gold)' }}>
        Players ({players.length})
      </h2>

      {/* Add Player Form */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="First"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="input-field flex-1 text-sm"
        />
        <input
          type="text"
          placeholder="Last"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="input-field flex-1 text-sm"
        />
        <button
          type="submit"
          className="btn-success text-xs whitespace-nowrap"
          disabled={adding || !firstName.trim() || !lastName.trim()}
          style={{ padding: '6px 12px' }}
        >
          {adding ? '...' : 'Add'}
        </button>
      </form>

      {/* Players List */}
      {players.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-2">
          No players registered yet. Add players above or they can self-register on the Play page.
        </p>
      ) : (
        <div className="space-y-1 max-h-[250px] overflow-y-auto">
          {players.map(player => (
            <div
              key={player.id}
              className="flex items-center justify-between py-1.5 px-2 rounded text-sm"
              style={{ background: 'rgba(0,0,0,0.15)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(212,175,55,0.2)', color: 'var(--nbc-gold)' }}>
                  {player.initials}
                </span>
                <span className="truncate text-gray-300">
                  {player.firstName} {player.lastName}
                </span>
                {squareCounts[player.initials] > 0 && (
                  <span className="text-xs text-gray-500">
                    ({squareCounts[player.initials]} sq)
                  </span>
                )}
              </div>
              <button
                onClick={() => onRemovePlayer(player.id, `${player.firstName} ${player.lastName}`)}
                className="text-red-400 hover:text-red-300 text-xs ml-2 flex-shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Build game context for likelihood calculations
function buildGameContext(gameData) {
  if (!gameData) return {};

  const { quarters, scores } = gameData;

  let quarter = 1;
  if (quarters.q1.completed && !quarters.q2.completed) quarter = 2;
  else if (quarters.q2.completed && !quarters.q3.completed) quarter = 3;
  else if (quarters.q3.completed && !quarters.q4.completed) quarter = 4;
  else if (quarters.q4.completed) quarter = 4;

  return {
    quarter,
    homeScore: scores.home,
    awayScore: scores.away,
    includeDoubleScores: true,
  };
}

export default AdminPage;
