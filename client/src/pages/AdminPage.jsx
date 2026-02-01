import { useState } from 'react';
import { useGameData } from '../hooks/useGameData';
import SquaresGrid from '../components/SquaresGrid';
import { getQuarterName, formatCurrency } from '../utils/helpers';

function AdminPage() {
  const { gameData, loading, error, refetch } = useGameData(5000);
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const apiCall = async (endpoint, body) => {
    try {
      const response = await fetch(`/api/admin/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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
      <h1 className="text-3xl font-bold text-center text-yellow-400">
        Admin Controls
      </h1>

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
          {/* Team Setup */}
          <TeamSetup
            teams={gameData.teams}
            onSave={async (teams) => {
              await apiCall('teams', teams);
              showMessage('Teams updated');
            }}
          />

          {/* Score Control */}
          <ScoreControl
            scores={gameData.scores}
            teams={gameData.teams}
            onUpdate={async (scores) => {
              await apiCall('scores', scores);
              showMessage('Scores updated');
            }}
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

        {/* Right Column - Grid Preview */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 text-yellow-400">Grid Preview</h2>
          <SquaresGrid gameData={gameData} />
        </div>
      </div>
    </div>
  );
}

function TeamSetup({ teams, onSave }) {
  const [homeTeam, setHomeTeam] = useState(teams.home);
  const [awayTeam, setAwayTeam] = useState(teams.away);

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Team Setup</h2>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Home Team</label>
          <input
            type="text"
            className="input-field w-full mb-2"
            placeholder="Team name"
            value={homeTeam.name}
            onChange={(e) => setHomeTeam({ ...homeTeam, name: e.target.value })}
          />
          <input
            type="text"
            className="input-field w-full"
            placeholder="Abbrev (e.g. KC)"
            maxLength={5}
            value={homeTeam.abbreviation}
            onChange={(e) => setHomeTeam({ ...homeTeam, abbreviation: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Away Team</label>
          <input
            type="text"
            className="input-field w-full mb-2"
            placeholder="Team name"
            value={awayTeam.name}
            onChange={(e) => setAwayTeam({ ...awayTeam, name: e.target.value })}
          />
          <input
            type="text"
            className="input-field w-full"
            placeholder="Abbrev (e.g. PHI)"
            maxLength={5}
            value={awayTeam.abbreviation}
            onChange={(e) => setAwayTeam({ ...awayTeam, abbreviation: e.target.value })}
          />
        </div>
      </div>
      <button
        onClick={() => onSave({ homeTeam, awayTeam })}
        className="btn-primary w-full"
      >
        Save Teams
      </button>
    </div>
  );
}

function ScoreControl({ scores, teams, onUpdate }) {
  const [homeScore, setHomeScore] = useState(scores.home);
  const [awayScore, setAwayScore] = useState(scores.away);

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Score Control</h2>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            {teams.away.name}
          </label>
          <input
            type="number"
            className="input-field w-full text-2xl text-center"
            value={awayScore}
            min={0}
            onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            {teams.home.name}
          </label>
          <input
            type="number"
            className="input-field w-full text-2xl text-center"
            value={homeScore}
            min={0}
            onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
          />
        </div>
      </div>
      <button
        onClick={() => onUpdate({ homeScore, awayScore })}
        className="btn-primary w-full"
      >
        Update Scores
      </button>
    </div>
  );
}

function GridControl({ locked, squaresClaimed, onLock }) {
  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Grid Control</h2>
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
      ) : (
        <button
          onClick={onLock}
          className="btn-success w-full"
          disabled={squaresClaimed < 100}
        >
          {squaresClaimed < 100
            ? `Need ${100 - squaresClaimed} more squares`
            : 'Lock Grid & Randomize Numbers'}
        </button>
      )}
    </div>
  );
}

function QuarterControl({ quarters, scores, gridLocked, onMarkQuarter }) {
  if (!gridLocked) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Quarter Payouts</h2>
        <p className="text-gray-400">Lock the grid first to enable quarter payouts</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Quarter Payouts</h2>
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
      <h2 className="text-xl font-bold mb-4">Danger Zone</h2>
      <button onClick={onReset} className="btn-danger w-full">
        Reset Entire Game
      </button>
    </div>
  );
}

export default AdminPage;
